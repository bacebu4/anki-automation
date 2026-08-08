import { addNote, healthcheck, notesInfo, sync } from './api';

export const load = async ({
  ankiUrl,
  dryRun,
  payloads,
}: {
  ankiUrl: string;
  dryRun: boolean;
  payloads: {
    fromValue: string;
    toValue: string;
    deckName: string;
    audioUrl?: string;
    label?: string;
  }[];
}) => {
  const { isHealthy } = await healthcheck({ ankiUrl });

  if (!isHealthy) {
    console.log(`❌ Expected for AnkiConnect to be running at ${ankiUrl}. Exiting`);
    process.exit(1);
  }

  const failedTranslations: string[] = [];

  for (let i = 0; i < payloads.length; i += 1) {
    const result = await doLoad({
      ...payloads[i],
      ankiUrl,
      dryRun,
      i,
      length: payloads.length,
    });

    if (result.failed) {
      failedTranslations.push(payloads[i].label ?? payloads[i].fromValue);
    }
  }

  await sync({ ankiUrl });

  console.log(`✨ Operation completed.`);
  if (failedTranslations.length) {
    console.log(`😔 Failed translations:`);
    console.log(failedTranslations.map(t => ` •  ${t}`).join('\n'));
  }
};

const doLoad = async ({
  ankiUrl,
  deckName,
  fromValue,
  toValue,
  dryRun,
  i,
  length,
  audioUrl,
  label,
}: {
  fromValue: string;
  toValue: string;
  ankiUrl: string;
  deckName: string;
  dryRun: boolean;
  i: number;
  length: number;
  audioUrl?: string;
  label?: string;
}) => {
  const note = { front: fromValue, back: toValue, audioUrl };
  const displayFront = label ?? fromValue;

  console.log(`⏳ "${displayFront}" –-> "${toValue}" for deck "${deckName}" ...`);

  const response = !dryRun ? await addNote({ ankiUrl, deckName, note }) : {};

  if (response.error) {
    console.log(
      `❌ Failed "${displayFront} – ${toValue}". ${response.error || ''} [${i + 1}/${length}]`,
    );
    return { failed: displayFront };
  }

  if (audioUrl && response.result) {
    const { front } = await notesInfo({ ankiUrl, noteId: response.result });
    if (
      front.includes('Connection') ||
      front.includes('ConnectionResetError') ||
      front.includes('_ssl.c')
    ) {
      console.log(`⚠️ "${displayFront} – ${toValue}" added but audio failed [${i + 1}/${length}]`);
      return { failed: displayFront };
    }
  }

  console.log(`✅ "${displayFront} – ${toValue}" [${i + 1}/${length}]`);

  return {};
};
