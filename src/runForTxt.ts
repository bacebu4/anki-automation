import { load } from './loader';
import { readFile } from 'fs/promises';
import * as googleTTS from 'google-tts-api';

const config: Record<string, { filePath: string; deckName: string; lang: string }> = {
  en: { filePath: './assets/en.txt', deckName: 'Unknown English', lang: 'en' },
  ru: { filePath: './assets/ru.txt', deckName: 'Russian', lang: 'ru' },
};

const run = async ({ ankiUrl, dryRun }: { ankiUrl: string; dryRun: boolean }) => {
  const chosenLanguage = process.argv.at(2);

  if (!chosenLanguage || !config[chosenLanguage]) {
    console.log(
      `❌ Unsupported language: "${chosenLanguage ?? 'none'}". Allowed: ${Object.keys(config).map(l => `"${l}"`).join(', ')}`,
    );
    process.exit(1);
  }

  if (dryRun) {
    console.log(`🚧 Running in dry mode...`);
  }

  const { filePath, deckName, lang } = config[chosenLanguage];
  const content = await readFile(filePath, 'utf-8');

  if (!content) {
    console.log(`❌ File not exists or empty. Exiting`);
    process.exit(1);
  }

  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.split('/'))
    .map(([fromValue, toValue]) => ({ fromValue, toValue }));

  const payloads = lines.map(({ fromValue, toValue }) => ({
    fromValue,
    toValue,
    deckName,
    audioUrl: googleTTS.getAudioUrl(fromValue, { lang }),
  }));

  await load({ ankiUrl, dryRun, payloads });
};

run({
  ankiUrl: 'http://127.0.0.1:8765',
  dryRun: true,
});
