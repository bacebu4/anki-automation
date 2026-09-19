import { readdir, access } from 'fs/promises';
import { basename, join } from 'path';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { setNoteAudio, findNotes, healthcheck, notesInfo, sync } from './api';
import { convertVoice, generateJapaneseTts } from './tts';

const VOICES_DIR = 'assets/voices';

const exists = (p: string) => access(p).then(() => true, () => false);

// Accepts a path or a bare filename from assets/voices.
async function pickVoice(ref?: string): Promise<string> {
  if (ref) {
    for (const p of [ref, join(VOICES_DIR, ref)]) if (await exists(p)) return p;
    throw new Error(`Reference not found: ${ref} (looked in . and ${VOICES_DIR})`);
  }
  const voices = (await readdir(VOICES_DIR)).filter(f => f.endsWith('.wav'));
  if (!voices.length) throw new Error(`No .wav reference in ${VOICES_DIR}`);
  return join(VOICES_DIR, voices[Math.floor(Math.random() * voices.length)]);
}

const run = async ({ ankiUrl, tag, ref }: { ankiUrl: string; tag: string; ref?: string }) => {
  if (!(await healthcheck({ ankiUrl })).isHealthy) {
    console.log('❌ AnkiConnect is not reachable. Is Anki running?');
    process.exit(1);
  }

  const refPath = await pickVoice(ref);
  const voice = basename(refPath).split('.')[0];
  console.log(`🎤 Voice: ${voice} (${refPath})`);

  const noteIds = await findNotes({ ankiUrl, query: `tag:${tag}` });
  console.log(`🔎 ${noteIds.length} notes tagged "${tag}"`);

  for (const [i, noteId] of noteIds.entries()) {
    const { fields } = await notesInfo({ ankiUrl, noteId });
    const word = fields.Word;
    const label = `[${i + 1}/${noteIds.length}] "${word}"`;
    // Same hash as runForJp; the Audio field is replaced, the old jpm-<hash>.mp3 stays in media until Check Media.
    const filename = `jpm-${createHash('md5').update(word).digest('hex').slice(0, 8)}-${voice}.mp3`;
    if (fields.Audio?.trim() === `[sound:${filename}]`) {
      console.log(`${label} ⏭️  already has ${voice}`);
      continue;
    }
    console.log(`${label} ⏳ converting...`);
    const source = await generateJapaneseTts(word, `${filename}.source.mp3`);
    const converted = await convertVoice(source, refPath, join(tmpdir(), filename));
    const { error } = await setNoteAudio({ ankiUrl, noteId, audioPath: converted, filename, field: 'Audio' });
    console.log(error ? `${label} ❌ ${JSON.stringify(error)}` : `${label} ✅ ${filename}`);
  }

  console.log('⏳ Syncing...');
  await sync({ ankiUrl });
  console.log('✅ Done');
};

const [tag, ref] = process.argv.slice(2);
if (!tag) {
  console.log('Usage: bun run ./src/addVoice <tag> [assets/voices/<name>.shift<N>.wav]');
  process.exit(1);
}
run({ ankiUrl: 'http://127.0.0.1:8765', tag, ref });
