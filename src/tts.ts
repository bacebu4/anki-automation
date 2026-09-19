import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// Decision record 0001: Edge "Read Aloud" neural voices. toFile() always writes audio.mp3, so stream + write ourselves.
export async function generateJapaneseTts(text: string, filename: string, voice = 'ja-JP-NanamiNeural'): Promise<string> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  for await (const chunk of audioStream) chunks.push(chunk as Buffer);
  tts.close();
  const path = join(tmpdir(), filename);
  await writeFile(path, Buffer.concat(chunks));
  return path;
}
