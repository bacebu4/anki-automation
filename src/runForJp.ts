import { load } from './loader';
import { readFile } from 'fs/promises';
import { initFurigana, toFuriganaHtml } from './furigana';
import { getJapaneseTtsUrl } from './ttsmp3';
import { setTimeout } from 'timers/promises';

const FURIGANA_STYLE = `<style>
rt { visibility: hidden; }
rt.show { visibility: visible; }
</style>`;

const FURIGANA_SCRIPT = `<script>
if (document.getElementById('answer')) {
  document.querySelectorAll('rt').forEach(function(r) { r.classList.add('show'); });
}
</script>`;

function wrapWithFurigana(rubyHtml: string): string {
  return `${FURIGANA_STYLE}<div>${rubyHtml}</div>${FURIGANA_SCRIPT}`;
}

const run = async ({
  filePath,
  ankiUrl,
  dryRun,
}: {
  filePath: string;
  ankiUrl: string;
  dryRun: boolean;
}) => {
  if (dryRun) {
    console.log(`🚧 Running in dry mode...`);
  }

  const content = await readFile(filePath, 'utf-8');

  if (!content) {
    console.log(`❌ File not exists or empty. Exiting`);
    process.exit(1);
  }

  console.log('⏳ Initializing furigana engine...');
  await initFurigana();
  console.log('✅ Furigana engine ready');

  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split('/'))
    .map(([fromValue, toValue]) => ({ fromValue, toValue }));

  const payloads = [];

  for (const { fromValue, toValue } of lines) {
    const furiganaHtml = await toFuriganaHtml(fromValue);
    const audioUrl = await getJapaneseTtsUrl(fromValue);
    await setTimeout(1_000);
    payloads.push({
      fromValue: wrapWithFurigana(furiganaHtml),
      fromLanguage: 'jp',
      toValue,
      toLanguage: 'en',
      audioUrl,
    });
  }

  await load({
    ankiUrl,
    dryRun,
    payloads: payloads.map(p => ({ ...p, deckName: 'JPM' })),
  });
};

run({
  ankiUrl: 'http://127.0.0.1:8765',
  dryRun: false,
  filePath: './assets/jp.txt',
});
