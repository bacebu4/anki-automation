import preslovi from '@pionir/preslovljivac';
import * as googleTTS from 'google-tts-api';
import { setTimeout } from 'node:timers/promises';
import { addNote, healthcheck, sync } from './api';

const AUDIO_FOR_LANGUAGE = 'sr';
const SLEEP_FOR = 100;

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

    await setTimeout(SLEEP_FOR);
  }

  await sync({ ankiUrl });

  console.log(`✨ Operation completed.`);
  if (failedTranslations.length) {
    console.log(`😔 Failed translations:`);
    console.log(failedTranslations.map(t => ` •  ${t}`).join('\n'));
  }
};

const doLoad = async ({
  fromLanguage,
  toLanguage,
  ankiUrl,
  deckName,
  fromValue,
  toValue,
  dryRun,
  i,
  length,
}: {
  fromLanguage: string;
  fromValue: string;
  toLanguage: string;
  toValue: string;
  ankiUrl: string;
  deckName: string;
  dryRun: boolean;
  i: number;
  length: number;
}) => {
  const note =
    AUDIO_FOR_LANGUAGE === fromLanguage
      ? {
          back: fromValue,
          front: toValue,
          audioUrl: googleTTS.getAudioUrl(fromValue, { lang: fromLanguage }),
        }
      : AUDIO_FOR_LANGUAGE === toLanguage
      ? {
          back: toValue,
          front: fromValue,
          audioUrl: googleTTS.getAudioUrl(toValue, { lang: toLanguage }),
        }
      : { back: toValue, front: fromValue };

  if (fromLanguage === 'sr' || toLanguage === 'sr') {
    note.back = preslovi(note.back, '', 'Cyrl');
  }

  console.log(`⏳ "${fromValue}" –-> "${toValue}" for deck "${deckName}" ...`);

  let response: { error?: unknown } = !dryRun ? await addNote({ ankiUrl, deckName, note }) : {};

  if (response.error) {
    console.log(
      `❌ Failed "${note.front} – ${note.back}". ${response.error || ''} [${i + 1}/${length}]`,
    );
    return { failed: fromValue };
  }

  console.log(`✅ "${note.front} – ${note.back}" [${i + 1}/${length}]`);

  return {};
};
