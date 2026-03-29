import { addNote, healthcheck, sync } from './api';

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
    fromLanguage: string;
    toLanguage: string;
    deckName: string;
    audioUrl?: string;
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
      failedTranslations.push(payloads[i].fromValue);
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
}: {
  fromValue: string;
  toValue: string;
  ankiUrl: string;
  deckName: string;
  dryRun: boolean;
  i: number;
  length: number;
  audioUrl?: string;
}) => {
  const note = { front: fromValue, back: toValue, audioUrl };

  console.log(`⏳ "${fromValue}" –-> "${toValue}" for deck "${deckName}" ...`);

  let response: { error?: unknown } = !dryRun ? await addNote({ ankiUrl, deckName, note }) : {};

  if (response.error) {
    console.log(
      `❌ Failed "${note.front} – ${note.back}". ${response.error || ''} [${i + 1}/${length}]`,
    );
    return { failed: fromValue };
  }

  console.log(
    `✅ "${note.front} – ${note.back}" (audio url: ${note.audioUrl}) [${i + 1}/${length}]`,
  );

  return {};
};
