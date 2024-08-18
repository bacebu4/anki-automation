import * as XLSX from 'xlsx';

console.log(XLSX);

const parse = async (): Promise<
  { fromLanguage: string; toLanguage: string; fromValue: string; toValue: string }[]
> => {
  const workbook = await XLSX.readFile('./assets/Saved translations.xlsx');
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
      console.log({ letter });
      const name = nameFor.get(letter);
      return name && !Number.isNaN(column) ? { name, value: value.v, column } : null;
    })
    .filter(v => v !== null);

  const grouped = a.reduce((acc: Record<string, unknown>, val) => {
    return { ...acc, [val.column]: { ...(acc[val.column] || {}), [val.name]: val.value } };
  }, {});

  console.log(Object.values(grouped));
  return Object.values(grouped);
};

parse();
