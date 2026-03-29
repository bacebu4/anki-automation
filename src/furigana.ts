// @ts-expect-error no types available
import Kuroshiro from 'kuroshiro';
// @ts-expect-error no types available
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji';

let kuroshiro: InstanceType<typeof Kuroshiro> | null = null;

export async function initFurigana(): Promise<void> {
  kuroshiro = new Kuroshiro();
  await kuroshiro.init(new KuromojiAnalyzer());
}

export async function toFuriganaHtml(text: string): Promise<string> {
  if (!kuroshiro) {
    throw new Error('Kuroshiro not initialized. Call initFurigana() first.');
  }

  return kuroshiro.convert(text, { mode: 'furigana', to: 'hiragana' });
}
