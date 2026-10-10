/** Mikoa ya Tanzania (Bara na Zanzibar). */
export const TANZANIA_REGIONS = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera", "Katavi", "Kigoma", "Kilimanjaro", "Lindi",
  "Manyara", "Mara", "Mbeya", "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pwani", "Rukwa", "Ruvuma",
  "Shinyanga", "Simiyu", "Singida", "Songwe", "Tabora", "Tanga",
  "Kaskazini Pemba", "Kusini Pemba", "Kaskazini Unguja", "Kusini Unguja", "Mjini Magharibi",
] as const;

export function isTanzaniaRegion(value: string): boolean {
  return (TANZANIA_REGIONS as readonly string[]).includes(value);
}
