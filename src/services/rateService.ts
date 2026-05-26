export interface ExchangeRates {
  USD: number;
  EUR: number;
  CNY: number;
  MGA: number;
}

export const fetchExchangeRates = async (): Promise<ExchangeRates | null> => {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();
    
    if (data.result === 'success') {
      const rates = data.rates;
      // Rates are relative to 1 USD
      // We want rates TO MGA
      // USD_to_MGA = rates.MGA
      // EUR_to_MGA = rates.MGA / rates.EUR
      // CNY_to_MGA = rates.MGA / rates.CNY
      
      return {
        USD: rates.MGA,
        EUR: rates.MGA / rates.EUR,
        CNY: rates.MGA / rates.CNY,
        MGA: 1
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    return null;
  }
};

export const convertToMGA = (amount: number, currency: string, rates: ExchangeRates): number => {
  if (currency === 'MGA') return amount;
  const rate = rates[currency as keyof ExchangeRates];
  return amount * (rate || 0);
};
