import { readFile } from 'fs/promises';
import jsGoogleTranslateFree from '@kreisler/js-google-translate-free';
import { setTimeout } from 'timers/promises';

const SLEEP_FOR = 500;

export const parseTxt = async ({
  filePath,
  fromLanguage,
  toLanguage,
}: {
  filePath: string;
  fromLanguage: string;
  toLanguage: string;
}) => {
  const content = await readFile(filePath, 'utf-8');

  if (!content) {
    console.log(`❌ File not exists or empty. Exiting`);
    process.exit(1);
  }

  const fromValues = content
    .split('\n')
    .map(l => l.trim().toLowerCase())
    .filter(Boolean);

  const payloads: {
    fromValue: string;
    toValue: string;
    fromLanguage: string;
    toLanguage: string;
  }[] = [];

  for (const fromValue of fromValues) {
    const toValue = await jsGoogleTranslateFree.translate(fromLanguage, toLanguage, fromValue);
    await setTimeout(SLEEP_FOR);
    payloads.push({ fromValue, toValue, fromLanguage, toLanguage });
  }

  return payloads;
};
