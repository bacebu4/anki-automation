import jsGoogleTranslateFree from '@kreisler/js-google-translate-free';
import preslovi from '@pionir/preslovljivac';
import { readFile, writeFile } from 'fs/promises';
import * as googleTTS from 'google-tts-api';
import { setTimeout } from 'node:timers/promises';
import { addNote, sync } from './api';

const load = async ({
  filePath,
  fromLanguage,
  toLanguage,
  audioFor,
  ankiUrl,
  deckName,
  sleepFor,
  dryRun,
}: {
  filePath: string;
  fromLanguage: string;
  toLanguage: string;
  audioFor: 'from' | 'to' | 'nothing';
  ankiUrl: string;
  deckName: string;
  sleepFor: number;
  dryRun: boolean;
}) => {
  if (dryRun) {
    console.log(`🚧 Running in dry mode...`);
  }

  const ankiHealthCheck = await fetch(ankiUrl, { method: 'GET' })
    .then(r => r.text())
    .catch(() => '');

  if (ankiHealthCheck !== 'AnkiConnect v.6') {
    console.log(`❌ Expected for AnkiConnect to be running at ${ankiUrl}. Exiting`);
    process.exit(1);
  }

  const content = await readFile(filePath, 'utf-8');

  if (!content) {
    console.log(`❌ File not exists or empty. Exiting`);
    process.exit(1);
  }

  const toTranslate = content
    .split('\n')
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);

  const failedTranslations: string[] = [];

  for (let i = 0; i < toTranslate.length; i += 1) {
    const singleToTranslate = toTranslate[i];

    const translated = await jsGoogleTranslateFree.translate(
      fromLanguage,
      toLanguage,
      singleToTranslate,
    );

    const note =
      audioFor === 'from'
        ? {
            back: singleToTranslate,
            front: translated,
            audioUrl: googleTTS.getAudioUrl(singleToTranslate, { lang: fromLanguage }),
          }
        : audioFor === 'to'
        ? {
            back: translated,
            front: singleToTranslate,
            audioUrl: googleTTS.getAudioUrl(translated, { lang: toLanguage }),
          }
        : { back: translated, front: singleToTranslate };

    if (fromLanguage === 'sr' || toLanguage === 'sr') {
      note.back = preslovi(note.back, '', 'Cyrl');
    }

    console.log(`⏳ "${singleToTranslate}" –-> "${translated}" ...`);

    let response: { error?: unknown } = !dryRun ? await addNote({ ankiUrl, deckName, note }) : {};

    if (response.error) {
      console.log(
        `❌ Failed "${note.front} – ${note.back}". ${response.error || ''} [${i + 1}/${
          toTranslate.length
        }]`,
      );
      failedTranslations.push(singleToTranslate);
    } else {
      console.log(`✅ "${note.front} – ${note.back}" [${i + 1}/${toTranslate.length}]`);
    }

    await setTimeout(sleepFor);
  }

  await sync({ ankiUrl });

  console.log(
    `✨ Operation completed. ${
      failedTranslations.length ? 'Failed translations are logged to "./assets/failed.txt"' : ''
    }`,
  );

  await writeFile('./assets/failed.txt', failedTranslations.join('\n'));

  if (!dryRun) {
    // empty input file
    await writeFile(filePath, '');
  }
};

const argumentsFor: Record<
  string,
  Pick<
    Parameters<typeof load>[number],
    'fromLanguage' | 'toLanguage' | 'audioFor' | 'filePath' | 'deckName'
  >
> = {
  sr: {
    fromLanguage: 'sr',
    toLanguage: 'ru',
    audioFor: 'from',
    filePath: './assets/sr.txt',
    deckName: 'Own Serbian',
  },
  ru: {
    fromLanguage: 'ru',
    toLanguage: 'sr',
    audioFor: 'to',
    filePath: './assets/ru.txt',
    deckName: 'Own Serbian',
  },
  en: {
    fromLanguage: 'en',
    toLanguage: 'ru',
    audioFor: 'nothing',
    filePath: './assets/en.txt',
    deckName: 'Unknown English',
  },
} as const;

const chosenLanguage = process.argv.at(2);

if (!chosenLanguage || !Object.keys(argumentsFor).includes(chosenLanguage)) {
  console.log(
    `❌ Unsupported language provided: "${chosenLanguage || 'none'}". Allowed values: ${Object.keys(
      argumentsFor,
    )
      .map(l => `"${l}"`)
      .join(', ')}`,
  );
  process.exit(1);
}

load({
  ...argumentsFor[chosenLanguage],
  ankiUrl: 'http://127.0.0.1:8765',
  sleepFor: 500,
  dryRun: true,
});
