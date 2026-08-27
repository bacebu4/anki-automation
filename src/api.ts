export async function addNote({
  ankiUrl,
  deckName,
  note,
}: {
  ankiUrl: string;
  deckName: string;
  note: {
    front: string;
    back: string;
    audioUrl?: string;
    modelName?: string;
    fields?: Record<string, string>;
    audioField?: string;
    audioFilename?: string;
    tags?: string[];
  };
}): Promise<{ error?: unknown; result?: number }> {
  return await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'addNote',
      version: 6,
      params: {
        note: {
          deckName,
          modelName: note.modelName ?? 'Basic',
          tags: note.tags ?? [],
          fields: note.fields ?? {
            Front: note.front,
            Back: note.back,
          },
          ...(note.audioUrl && {
            audio: {
              url: note.audioUrl,
              filename: note.audioFilename ?? note.back,
              fields: [note.audioField ?? 'Front'],
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
  field = 'Front',
}: {
  ankiUrl: string;
  noteId: number;
  field?: string;
}): Promise<{ front: string }> {
  const info = await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'notesInfo',
      version: 6,
      params: { notes: [noteId] },
    }),
    method: 'POST',
  }).then(r => r.json());

  return { front: info.result?.[0]?.fields?.[field]?.value ?? '' };
}

export async function getTags({ ankiUrl }: { ankiUrl: string }): Promise<string[]> {
  const res = await fetch(ankiUrl, {
    body: JSON.stringify({ action: 'getTags', version: 6 }),
    method: 'POST',
  }).then(r => r.json());

  return res.result ?? [];
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
