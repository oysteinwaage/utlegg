const API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

export async function getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return 1;

  const from = fromCurrency.toLowerCase();
  const to = toCurrency.toLowerCase();

  const res = await fetch(`${API_BASE}/${from}.json`);
  if (!res.ok) throw new Error('Kunne ikke hente valutakurs');
  const data = (await res.json()) as Record<string, Record<string, number>>;

  const rate = data[from]?.[to];
  if (rate == null) throw new Error(`Ingen kurs funnet for ${fromCurrency} → ${toCurrency}`);
  return rate;
}

export interface Currency {
  value: string;
  label: string;
  symbol: string;
}

export const CURRENCIES: Currency[] = [
  { value: 'NOK', label: 'Norske kroner (NOK)', symbol: 'kr' },
  { value: 'EUR', label: 'Euro (EUR)',           symbol: '€' },
  { value: 'SEK', label: 'Svenske kroner (SEK)', symbol: 'kr' },
  { value: 'GBP', label: 'Britiske pund (GBP)',  symbol: '£' },
  { value: 'USD', label: 'Amerikanske dollar (USD)', symbol: '$' },
];

export function getCurrencySymbol(code: string): string {
  const found = CURRENCIES.find((c) => c.value === code);
  return found ? found.symbol : code;
}

export function getCurrencyLabel(code: string): string {
  const found = CURRENCIES.find((c) => c.value === code);
  return found ? found.label : code;
}
