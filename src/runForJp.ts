import { load } from './loader';
import { readFile } from 'fs/promises';
import { initFurigana, toFuriganaHtml } from './furigana';
import { getJapaneseTtsUrl } from './ttsmp3';
import { setTimeout } from 'timers/promises';
import { createHash } from 'crypto';

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

  for (let i = 0; i < lines.length; i++) {
    const { fromValue, toValue } = lines[i];
    const tag = `[${i + 1}/${lines.length}] "${fromValue}"`;
    const furiganaHtml = await toFuriganaHtml(fromValue);
    let audioUrl: string | undefined;
    if (!dryRun) {
      console.log(`\n${tag}`);
      console.log(`  ⏳ Generating audio...`);
      audioUrl = await getJapaneseTtsUrl(fromValue);
      console.log(`  ⏳ Audio ready: ${audioUrl}`);
      await setTimeout(1_000);
    }
    payloads.push({
      fromValue,
      toValue,
      deckName: 'JPM',
      audioUrl,
      label: fromValue,
      modelName: 'WaniKani OneSided',
      audioField: 'Audio',
      audioFilename: `jpm-${createHash('md5').update(fromValue).digest('hex').slice(0, 8)}.mp3`,
      tags: [`jpm-${new Date().toISOString().slice(0, 10)}`],
      fields: {
        Word: fromValue,
        Reading: furiganaHtml,
        Meaning: toValue,
        'Meaning explanation': '',
        Audio: '',
      },
    });
  }

  await load({
    ankiUrl,
    dryRun,
    payloads,
  });
};

run({
  ankiUrl: 'http://127.0.0.1:8765',
  dryRun: false,
  filePath: './assets/jp.txt',
});
