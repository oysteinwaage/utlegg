// fawazahmed0 currency API via jsDelivr CDN — free, no key, CORS-friendly
const API_BASE = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

export async function getExchangeRate(fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency) return 1;

  const from = fromCurrency.toLowerCase();
  const to = toCurrency.toLowerCase();

  const res = await fetch(`${API_BASE}/${from}.json`);
  if (!res.ok) throw new Error('Kunne ikke hente valutakurs');
  const data = await res.json();

  const rate = data[from]?.[to];
  if (rate == null) throw new Error(`Ingen kurs funnet for ${fromCurrency} → ${toCurrency}`);
  return rate;
}

export const CURRENCIES = [
  { value: 'NOK', label: 'Norske kroner (NOK)', symbol: 'kr' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'SEK', label: 'Svenske kroner (SEK)', symbol: 'kr' },
  { value: 'GBP', label: 'Britiske pund (GBP)', symbol: '£' },
  { value: 'USD', label: 'Amerikanske dollar (USD)', symbol: '$' },
];

export function getCurrencySymbol(code) {
  const found = CURRENCIES.find((c) => c.value === code);
  return found ? found.symbol : code;
}

export function getCurrencyLabel(code) {
  const found = CURRENCIES.find((c) => c.value === code);
  return found ? found.label : code;
}
