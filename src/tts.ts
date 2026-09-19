import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { mkdtemp, readdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join, resolve } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execFile);
const SEED_VC = resolve('vendor/seed-vc');

// Decision record 0002: Seed-VC, F0-conditioned so pitch accent survives. The semitone shift
// is encoded in the reference filename (voice.shift+6.wav) because it depends on the voice.
export async function convertVoice(sourcePath: string, refPath: string, outMp3: string): Promise<string> {
  const shift = /\.shift([+-]?\d+)\./.exec(basename(refPath))?.[1] ?? '0';
  const outDir = await mkdtemp(join(tmpdir(), 'vc-'));
  // ponytail: one python process per clip (~30 s, a third of it model load); loop inside python if sessions get long
  await exec(
    join(SEED_VC, '.venv/bin/python'),
    ['inference.py', '--source', resolve(sourcePath), '--target', resolve(refPath), '--output', outDir,
      '--diffusion-steps', '25', '--f0-condition', 'True', '--semi-tone-shift', shift, '--fp16', 'False'],
    { cwd: SEED_VC, maxBuffer: 1 << 24 },
  );
  const [wav] = await readdir(outDir);
  await exec('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(outDir, wav), '-b:a', '96k', outMp3]);
  return outMp3;
}

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
