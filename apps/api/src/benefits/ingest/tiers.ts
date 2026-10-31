// Masventas, HSBC and Brubank are absent from MODO's bank list.
export const ALLOWED_BANKS: string[] = [
  'macro',
  'banco-nacion',
  'santander',
  'galicia',
  'bbva',
  'patagonia',
  'hipotecario',
  'banco-santiago',
  'credicoop',
  'comafi',
  'supervielle',
];

// User-selectable tiers per bank (phase 0 audit). Codes are stored in profiles and eligibility facts.
export const BANK_TIERS: Record<string, { code: string; label: string }[]> = {
  galicia: [
    { code: 'masivo', label: 'Galicia' },
    { code: 'eminent', label: 'Éminent' },
    { code: 'eminent-black', label: 'Éminent Black' },
  ],
  macro: [
    { code: 'selecta-1', label: 'Selecta Nivel 1' },
    { code: 'selecta-2', label: 'Selecta Nivel 2' },
    { code: 'selecta-3', label: 'Selecta Nivel 3' },
    { code: 'selecta-4', label: 'Selecta Nivel 4' },
    { code: 'platinum', label: 'Platinum' },
    { code: 'private-black', label: 'Private Bank Black' },
    { code: 'private-infinite', label: 'Private Bank Infinite' },
  ],
};
