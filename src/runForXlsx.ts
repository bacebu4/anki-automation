import { load } from './loader';
import { parseXlsx } from './xlsxParser';

const run = async () => {
  const dryRun = false;

  if (dryRun) {
    console.log(`🚧 Running in dry mode...`);
  }

  const payloads = await parseXlsx({ filePath: './assets/Saved translations.xlsx' });

  await load({
    ankiUrl: 'http://127.0.0.1:8765',
    dryRun,
    payloads: payloads.map(p => ({
      ...p,
      deckName: [p.fromLanguage, p.toLanguage].includes('sr') ? 'Own Serbian' : 'Unknown English',
    })),
  });
};

run();
