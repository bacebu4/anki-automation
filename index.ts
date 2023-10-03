import jsGoogleTranslateFree from '@kreisler/js-google-translate-free';
import preslovi from '@pionir/preslovljivac';
import * as googleTTS from 'google-tts-api';

const load = async ({
  filePath,
  fromLanguage,
  toLanguage,
  audioFor,
  ankiUrl,
  deckName,
  sleepFor,
}: {
  filePath: string;
  fromLanguage: string;
  toLanguage: string;
  audioFor: 'from' | 'to';
  ankiUrl: string;
  deckName: string;
  sleepFor: number;
}) => {
  const ankiHealthCheck = await fetch(ankiUrl, { method: 'GET' })
    .then(r => r.text())
    .catch(() => '');

  if (ankiHealthCheck !== 'AnkiConnect v.6') {
    console.log(`❌ Expected for AnkiConnect to be running at ${ankiUrl}. Exiting`);
    process.exit(1);
  }

  const content = await Bun.file(filePath)
    .text()
    .catch(() => undefined);

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
            audioUrl: googleTTS.getAudioUrl(singleToTranslate, {
              lang: fromLanguage,
              slow: false,
              host: 'https://translate.google.com',
            }),
          }
        : {
            back: translated,
            front: singleToTranslate,
            audioUrl: googleTTS.getAudioUrl(translated, {
              lang: toLanguage,
              slow: false,
              host: 'https://translate.google.com',
            }),
          };

    const backInLatin = preslovi(note.back, '', 'Cyrl');

    console.log(`⏳ "${singleToTranslate}" –-> "${translated}" ...`);

    await Bun.sleep(sleepFor);

    const response = await fetch(ankiUrl, {
      body: JSON.stringify({
        action: 'addNote',
        version: 6,
        params: {
          note: {
            deckName,
            modelName: 'Basic (and reversed card)',
            fields: {
              Front: note.front,
              Back: backInLatin,
            },
            audio: {
              url: note.audioUrl,
              filename: backInLatin,
              fields: ['Back'],
            },
          },
        },
      }),
      method: 'POST',
    }).then(r => r.json());

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

    await Bun.sleep(sleepFor);
  }

  console.log(
    `✨ Operation completed. ${
      failedTranslations.length ? 'Failed translations are logged to "./assets/failed.txt"' : ''
    }`,
  );

  await Bun.write(Bun.file('./assets/failed.txt'), failedTranslations.join('\n'));
  await Bun.write(Bun.file(filePath), '');
};

const argumentsFor: Record<
  string,
  Pick<Parameters<typeof load>[number], 'fromLanguage' | 'toLanguage' | 'audioFor' | 'filePath'>
> = {
  sr: {
    fromLanguage: 'sr',
    toLanguage: 'ru',
    audioFor: 'from',
    filePath: './assets/sr.txt',
  },
  ru: {
    fromLanguage: 'ru',
    toLanguage: 'sr',
    audioFor: 'to',
    filePath: './assets/ru.txt',
  },
} as const;

const chosenLanguage = Bun.argv.at(2);

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
  deckName: 'Own Serbian',
  sleepFor: 500,
});
