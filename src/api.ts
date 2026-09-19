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
    audioPath?: string;
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
          ...(note.audioPath && {
            audio: {
              path: note.audioPath,
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
}): Promise<{ front: string; fields: Record<string, string> }> {
  const info = await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'notesInfo',
      version: 6,
      params: { notes: [noteId] },
    }),
    method: 'POST',
  }).then(r => r.json());

  const raw: Record<string, { value: string }> = info.result?.[0]?.fields ?? {};
  const fields = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.value]));
  return { front: fields[field] ?? '', fields };
}

export async function findNotes({ ankiUrl, query }: { ankiUrl: string; query: string }): Promise<number[]> {
  const res = await fetch(ankiUrl, {
    body: JSON.stringify({ action: 'findNotes', version: 6, params: { query } }),
    method: 'POST',
  }).then(r => r.json());

  return res.result ?? [];
}

// Replaces `field` with [sound:filename]; AnkiConnect sets fields first, then attaches the file.
export async function setNoteAudio({
  ankiUrl,
  noteId,
  audioPath,
  filename,
  field,
}: {
  ankiUrl: string;
  noteId: number;
  audioPath: string;
  filename: string;
  field: string;
}): Promise<{ error?: unknown }> {
  return await fetch(ankiUrl, {
    body: JSON.stringify({
      action: 'updateNoteFields',
      version: 6,
      params: { note: { id: noteId, fields: { [field]: '' }, audio: [{ path: audioPath, filename, fields: [field] }] } },
    }),
    method: 'POST',
  }).then(r => r.json());
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
