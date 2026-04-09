export async function addNote({
  ankiUrl,
  deckName,
  note,
}: {
  ankiUrl: string;
  deckName: string;
  note: { front: string; back: string; audioUrl?: string };
}): Promise<{ error?: unknown; result?: number }> {
  return await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'addNote',
      version: 6,
      params: {
        note: {
          deckName,
          modelName: 'Basic',
          fields: {
            Front: note.front,
            Back: note.back,
          },
          ...(note.audioUrl && {
            audio: {
              url: note.audioUrl,
              filename: note.back,
              fields: ['Front'],
            },
          }),
        },
      },
    }),
    method: 'POST',
  }).then(r => r.json());
}

export async function notesInfo({
  ankiUrl,
  noteId,
}: {
  ankiUrl: string;
  noteId: number;
}): Promise<{ front: string }> {
  const info = await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'notesInfo',
      version: 6,
      params: { notes: [noteId] },
    }),
    method: 'POST',
  }).then(r => r.json());

  return { front: info.result?.[0]?.fields?.Front?.value ?? '' };
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
    .then(r => r.json())
    .catch(() => '');

  if (result.apiVersion !== 'AnkiConnect v.6') {
    return { isHealthy: false };
  }

  return { isHealthy: true };
}
