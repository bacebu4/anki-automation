export async function addNote({
  ankiUrl,
  deckName,
  note,
}: {
  ankiUrl: string;
  deckName: string;
  note: { front: string; back: string; audioUrl?: string };
}) {
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
