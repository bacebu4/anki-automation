declare module '@pionir/preslovljivac' {
  export default function preslovi(
    word: string,
    exceptions: string,
    type?: 'Cyrl' | (string & {}),
  ): string;
}
