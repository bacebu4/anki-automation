import * as XLSX from 'xlsx';

export const parseXlsx = async ({
  filePath,
}: {
  filePath: string;
}): Promise<{ fromLanguage: string; toLanguage: string; fromValue: string; toValue: string }[]> => {
  const workbook = await XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const nameFor = new Map([
    ['A', 'fromLanguage'],
    ['B', 'toLanguage'],
    ['C', 'fromValue'],
    ['D', 'toValue'],
  ]);
  const a = Object.entries(sheet)
    .map(([key, value]) => {
      const letter = key.slice(0, 1);
      const column = Number(key.slice(1));
      const name = nameFor.get(letter);
      return name && !Number.isNaN(column) ? { name, value: value.v, column } : null;
    })
    .filter(v => v !== null);

  const grouped = a.reduce((acc: Record<string, unknown>, val) => {
    return { ...acc, [val.column]: { ...(acc[val.column] || {}), [val.name]: val.value } };
  }, {});

  const languageFor = new Map([
    ['Russian', 'ru'],
    ['English', 'en'],
    ['Serbian', 'sr'],
  ]);

  return Object.values(grouped).map((v: any) => ({
    ...v,
    fromLanguage: languageFor.get(v.fromLanguage),
    toLanguage: languageFor.get(v.toLanguage),
  }));
};
