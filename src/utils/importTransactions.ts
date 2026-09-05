import * as XLSX from 'xlsx';
import type { ExpenseCategory } from '../types';

export interface ParsedTransaction {
  key: string;
  date: number;
  description: string;
  amount: number;
  currency: string;
  category?: ExpenseCategory;
}

const CATEGORY_KEYWORDS: { category: ExpenseCategory; keywords: string[] }[] = [
  { category: 'dagligvarer', keywords: ['COOP', 'REMA', 'KIWI', 'MENY', 'SPAR', 'BUNNPRIS', 'JOKER', 'ICA', 'EUROCASH', 'MATKROKEN', 'EXTRA', 'WILLYS', 'HEMKOP', 'LIDL', 'OBS'] },
  { category: 'restaurant_og_uteliv', keywords: ['PIZZERIA', 'CAFE', 'KAFE', 'RESTAURANT', ' BAR ', 'MCDONALD', 'BURGER', 'GRILL', 'KIOSK', 'DOLCE', 'PUB', 'BISTRO', 'SUSHI', 'BAKERI', 'CONDITORI'] },
  { category: 'transport_og_reise', keywords: ['AEROPORTO', 'AIRPORT', 'RUTERAPPEN', 'P-HUS', 'PARKERING', 'TAXI', 'UBER', 'SAS ', 'NORWEGIAN', 'WIDEROE', 'VY ', 'NSB', 'FERGE', 'DUTY-FREE', 'INFLIGHT', 'FLYTOGET', 'AVIS', 'HERTZ', 'RYANAIR'] },
  { category: 'kjoeretoey', keywords: ['BENSIN', 'ESSO', 'SHELL', 'CIRCLE K', 'UNO-X', 'UNOX', 'TRAFIKBUTIK', 'DEKK', 'BILVERKSTED', 'YX ', 'ST1'] },
  { category: 'klaer_og_tilbehoer', keywords: ['H&M', 'ZARA', 'LINDEX', 'DRESSMANN', 'CUBUS', 'BIK BOK', 'VOLT'] },
  { category: 'helse_og_velvare', keywords: ['APOTEK', 'VITUSAPOTEK', 'BOOTS', 'VITAL', 'TREENING', 'SATS', 'FYSIOTERAPI'] },
  { category: 'hjem_og_hage', keywords: ['IKEA', 'BAUHAUS', 'BYGGMAKKER', 'JULA', 'CLAS OHLSON', 'PLANTASJEN', 'JYSK'] },
  { category: 'fritid', keywords: ['CANOE', 'GOLF', 'XXL', 'LEKIA', 'FRITID', 'KINO', 'CINEMA'] },
  { category: 'ovrig_forbruk', keywords: ['APPLE.COM', 'ELKJOP', 'ELKJØP', 'POWER ', 'NETFLIX', 'SPOTIFY'] },
];

function guessCategory(description: string): ExpenseCategory | undefined {
  const upper = ` ${description.toUpperCase()} `;
  const match = CATEGORY_KEYWORDS.find(({ keywords }) => keywords.some((kw) => upper.includes(kw)));
  return match?.category;
}

export function transactionSignature(description: string, amount: number, date: number): string {
  const d = new Date(date);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${description.trim().toLowerCase()}|${Math.round(amount * 100)}|${day}`;
}

const HEADER_ALIASES: Record<'date' | 'description' | 'out', string[]> = {
  date: ['dato'],
  description: ['beløpet gjelder', 'belopet gjelder'],
  out: ['ut'],
};

function normalizeHeader(header: string): string {
  return header.toString().trim().toLowerCase();
}

export async function parseTransactionsFile(file: File): Promise<ParsedTransaction[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Fant ingen ark i filen.');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length === 0) throw new Error('Fant ingen rader i filen.');

  const sampleKeys = Object.keys(rows[0]);
  const findKey = (aliases: string[]) => sampleKeys.find((k) => aliases.includes(normalizeHeader(k)));

  const dateKey = findKey(HEADER_ALIASES.date);
  const descKey = findKey(HEADER_ALIASES.description);
  const outKey = findKey(HEADER_ALIASES.out);

  if (!dateKey || !descKey || !outKey) {
    throw new Error('Gjenkjenner ikke kolonnene i filen. Forventer kolonnene «Dato», «Beløpet gjelder» og «Ut».');
  }

  const transactions: ParsedTransaction[] = [];
  rows.forEach((row, idx) => {
    const description = String(row[descKey] ?? '').trim();
    const outVal = Number(row[outKey]);
    const hasOut = Number.isFinite(outVal) && outVal > 0;

    // Kreditering (penger inn på kortet), saldo fra forrige faktura og
    // den faste månedsprisen på kortet er ikke reelle utlegg.
    const isPreviousBalance = /skyldig bel[øo]p/i.test(description);
    const isMonthlyFee = /m[åa]nedspris/i.test(description);
    if (!hasOut || isPreviousBalance || isMonthlyFee) return;

    const dateVal = row[dateKey];
    const date = dateVal instanceof Date ? dateVal.getTime() : Date.parse(String(dateVal));

    transactions.push({
      key: `${idx}-${dateVal}-${description}`,
      date: Number.isFinite(date) ? date : Date.now(),
      description,
      amount: Math.round(outVal * 100) / 100,
      currency: 'NOK',
      category: guessCategory(description),
    });
  });
  return transactions;
}
