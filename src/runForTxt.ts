import { load } from './loader';
import { parseTxt } from './txtParser';

const run = async ({
  filePath,
  fromLanguage,
  toLanguage,
  ankiUrl,
  deckName,
  dryRun,
}: {
  filePath: string;
  fromLanguage: string;
  toLanguage: string;
  ankiUrl: string;
  deckName: string;
  dryRun: boolean;
}) => {
  if (dryRun) {
    console.log(`🚧 Running in dry mode...`);
  }

  const payloads = await parseTxt({ filePath, fromLanguage, toLanguage });

  await load({
    ankiUrl,
    dryRun,
    payloads: payloads.map(p => ({ ...p, deckName })),
  });
};

const argumentsFor: Record<
  string,
  Pick<Parameters<typeof run>[number], 'fromLanguage' | 'toLanguage' | 'filePath' | 'deckName'>
> = {
  sr: {
    fromLanguage: 'sr',
    toLanguage: 'ru',
    filePath: './assets/sr.txt',
    deckName: 'Own Serbian',
  },
  ru: {
    fromLanguage: 'ru',
    toLanguage: 'sr',
    filePath: './assets/ru.txt',
    deckName: 'Own Serbian',
  },
  en: {
    fromLanguage: 'en',
    toLanguage: 'ru',
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

run({
  ...argumentsFor[chosenLanguage],
  ankiUrl: 'http://127.0.0.1:8765',
  dryRun: true,
});
