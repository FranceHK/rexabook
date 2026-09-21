export const SMS_CHARACTERS_PER_UNIT = 160;
export const SMS_SELLING_PRICE = 20;
export const SMS_PROVIDER_COST = 15;
export const SMS_PROFIT_PER_UNIT = SMS_SELLING_PRICE - SMS_PROVIDER_COST;

export function countSmsUnits(message: string): number {
  const characters = Array.from(message).length;
  return Math.max(1, Math.ceil(characters / SMS_CHARACTERS_PER_UNIT));
}

export function smsPurchaseTotals(units: number) {
  return {
    total: units * SMS_SELLING_PRICE,
    providerCost: units * SMS_PROVIDER_COST,
    profit: units * SMS_PROFIT_PER_UNIT,
  };
}
