export async function addNote({
  ankiUrl,
  deckName,
  note,
}: {
  ankiUrl: string;
  deckName: string;
  note: { front: string; back: string; audioUrl?: string };
}): Promise<{ error?: unknown }> {
  return await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'addNote',
      version: 6,
      params: {
        note: {
          deckName,
          modelName: 'Basic (and reversed card)',
          fields: {
            Front: note.front,
            Back: note.back,
          },
          ...(note.audioUrl && {
            audio: {
              url: note.audioUrl,
              filename: note.back,
              fields: ['Back'],
            },
          }),
        },
      },
    }),
    method: 'POST',
  }).then(r => r.json());
}

export async function sync({ ankiUrl }: { ankiUrl: string }): Promise<{ error?: unknown }> {
  return await fetch(ankiUrl, {
    body: JSON.stringify({ action: 'sync', version: 6 }),
    method: 'POST',
  }).then(r => r.json());
}

export async function healthcheck({
  ankiUrl,
}: {
  ankiUrl: string;
}): Promise<{ isHealthy: boolean }> {
  const result = await fetch(ankiUrl, { method: 'GET' })
    .then(r => r.text())
    .catch(() => '');

  if (result !== 'AnkiConnect v.6') {
    return { isHealthy: false };
  }

  return { isHealthy: true };
}
