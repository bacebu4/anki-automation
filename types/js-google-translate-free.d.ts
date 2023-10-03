declare module '@kreisler/js-google-translate-free' {
  export function translate(
    sourceLanguage: string,
    targetLanguage: string,
    text: string,
  ): Promise<string>;
}
