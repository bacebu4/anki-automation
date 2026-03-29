export async function getJapaneseTtsUrl(text: string, speaker = 'Takumi'): Promise<string> {
  const params = new URLSearchParams({
    msg: text.replace(/&/g, ' and '),
    lang: speaker,
    source: 'ttsmp3',
  });

  const response = await fetch('https://ttsmp3.com/makemp3_new.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await response.json() as { Error: number | string; URL?: string };

  if (data.Error !== 0) {
    throw new Error(`ttsmp3 error: ${data.Error}`);
  }

  return data.URL!;
}
