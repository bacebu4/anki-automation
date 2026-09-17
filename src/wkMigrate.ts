import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { setTimeout } from 'timers/promises';

const ANKI = 'http://127.0.0.1:8765';
const DECK = 'Wanikani Ultimate 3: Tokyo Drift';
const CACHE = 'assets/wk-cache';
const DRY = process.argv.includes('--dry-run');
const TOKEN = process.env.WANIKANI_TOKEN;
if (!TOKEN) throw new Error('WANIKANI_TOKEN env is required');

// WK srs_stage -> Anki interval (days) ≈ FSRS stability
const IVL: Record<number, number> = { 1: 1, 2: 1, 3: 1, 4: 2, 5: 7, 6: 14, 7: 30, 8: 120, 9: 365 };
const TYPE: Record<string, string> = {
  radical: 'Radical',
  kanji: 'Kanji',
  vocabulary: 'Vocabulary',
  kana_vocabulary: 'Kana_Vocabulary',
};

async function anki<T = any>(action: string, params: object = {}): Promise<T> {
  const res = await fetch(ANKI, { method: 'POST', body: JSON.stringify({ action, version: 6, params }) }).then(r => r.json());
  if (res.error) throw new Error(`${action}: ${res.error}`);
  return res.result;
}

// Fetch every page of a WK collection once; each page is cached on disk.
async function wk(endpoint: string): Promise<any[]> {
  mkdirSync(CACHE, { recursive: true });
  const data: any[] = [];
  let url: string | null = `https://api.wanikani.com/v2/${endpoint}`;
  for (let page = 0; url; page += 1) {
    const file = `${CACHE}/${endpoint}-${page}.json`;
    let json: any;
    if (existsSync(file)) {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } else {
      console.log(`⬇️  ${url}`);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, 'Wanikani-Revision': '20170710' } });
      if (res.status === 429) {
        await setTimeout(Number(res.headers.get('RateLimit-Reset')) * 1000 - Date.now() + 1000);
        page -= 1;
        continue;
      }
      if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`);
      json = await res.json();
      writeFileSync(file, JSON.stringify(json));
    }
    data.push(...json.data);
    url = json.pages.next_url;
  }
  return data;
}

const subjects = await wk('subjects');
const assignments = await wk('assignments');
const stats = await wk('review_statistics');

const noteIds: number[] = await anki('findNotes', { query: `"deck:${DECK}"` });
const notes: any[] = await anki('notesInfo', { notes: noteIds });
const norm = (c: string | null) => (c ?? '').replace(/[〜～]/g, '');
const cardByKey = new Map(notes.map(n => [`${n.fields.Card_Type.value}|${n.fields.Characters.value}`, n.cards[0] as number]));
// WK writes 〜以上 where the deck has 以上; exact match first, tilde-stripped only as fallback
const cardByNorm = new Map(notes.map(n => [`${n.fields.Card_Type.value}|${norm(n.fields.Characters.value)}`, n.cards[0] as number]));
const radicalByMeaning = new Map(
  notes.filter(n => n.fields.Card_Type.value === 'Radical').map(n => [n.fields.Meaning.value.toLowerCase(), n.cards[0] as number]),
);

const statBySubject = new Map(stats.map(s => [s.data.subject_id, s.data]));
const subjectById = new Map(subjects.map(s => [s.id, s]));

type Plan = { card: number; stage: number; ivl: number; due: number; factor: number; lapses: number; label: string };
const plan: Plan[] = [];
const unmatched: string[] = [];
const byStage: Record<number, number> = {};

for (const a of assignments.map(a => a.data)) {
  if (!a.started_at || a.srs_stage < 1) continue;
  const s = subjectById.get(a.subject_id);
  if (!s || s.data.hidden_at) continue;
  const primary = s.data.meanings.find((m: any) => m.primary)?.meaning ?? '';
  const card =
    cardByKey.get(`${TYPE[s.object]}|${s.data.characters}`) ??
    cardByNorm.get(`${TYPE[s.object]}|${norm(s.data.characters)}`) ??
    (s.object === 'radical' ? radicalByMeaning.get(primary.toLowerCase()) : undefined);
  const label = `${s.object} ${s.data.characters ?? primary} (L${s.data.level})`;
  if (!card) {
    unmatched.push(label);
    continue;
  }
  const st = statBySubject.get(a.subject_id);
  const total = st ? st.meaning_correct + st.meaning_incorrect : 0;
  const accuracy = total ? st.meaning_correct / total : 1;
  const due = a.available_at ? Math.max(0, Math.round((Date.parse(a.available_at) - Date.now()) / 86_400_000)) : 365;
  const dup = plan.find(p => p.card === card);
  if (dup) {
    console.log(`⚠️  ${label} and ${dup.label} map to the same card; keeping the higher stage`);
    if (dup.stage >= a.srs_stage) continue;
    plan.splice(plan.indexOf(dup), 1);
    byStage[dup.stage] -= 1;
  }
  plan.push({ card, stage: a.srs_stage, ivl: IVL[a.srs_stage], due, factor: accuracy < 0.8 ? 2100 : 2500, lapses: st?.meaning_incorrect ?? 0, label });
  byStage[a.srs_stage] = (byStage[a.srs_stage] ?? 0) + 1;
}

console.log(`WK subjects ${subjects.length}, assignments ${assignments.length}, Anki notes ${notes.length}`);
console.log(`Matched ${plan.length} started items by stage:`, byStage);
console.log(`Unmatched ${unmatched.length}:`, unmatched.slice(0, 20));
if (DRY) process.exit(0);

// 1. reset any existing Anki progress on target cards (clears FSRS memory state)
const cards = plan.map(p => p.card);
await anki('forgetCards', { cards });
// 2. review queue + due date, batched by due day
const byDue = new Map<number, number[]>();
for (const p of plan) byDue.set(p.due, [...(byDue.get(p.due) ?? []), p.card]);
for (const [days, cs] of byDue) await anki('setDueDate', { cards: cs, days: `${days}!` });
// 3. interval / ease / lapses per card
for (let i = 0; i < plan.length; i += 200) {
  await anki('multi', {
    actions: plan.slice(i, i + 200).map(p => ({
      action: 'setSpecificValueOfCard',
      version: 6,
      params: { card: p.card, keys: ['ivl', 'factor', 'lapses'], newValues: [p.ivl, p.factor, p.lapses], warning_check: true },
    })),
  });
}
await anki('addTags', { notes: notes.filter(n => plan.some(p => p.card === n.cards[0] && p.stage === 9)).map(n => n.noteId), tags: 'wk_burned' });

// verify one card
const [check] = await anki('cardsInfo', { cards: [plan[0].card] });
console.log('Sample:', plan[0].label, { planned: plan[0], actual: { type: check.type, queue: check.queue, interval: check.interval, factor: check.factor, lapses: check.lapses } });
if (check.queue !== 2 || check.interval !== plan[0].ivl) throw new Error('verification failed');
console.log('✨ Done');
