/**
 * Tariff Salary Mappings
 * Contains typical 1st year Ausbildung salaries for various German tariff agreements
 * Data based on 2025/2026 collective bargaining agreements
 */

import { TariffType } from '@/types';

/**
 * Standard 1st year Ausbildung salaries by tariff type (in EUR/month)
 * These are typical values and may vary by region and specific agreement
 */
export const TARIFF_FIRST_YEAR_SALARIES: Record<TariffType, number | null> = {
  [TariffType.NONE]: null,
  
  // IG Metall - Metal and electrical engineering
  // One of the highest paying tariff agreements
  [TariffType.IG_METALL]: 1150, // 2025: ~1,150 EUR/month
  
  // ver.di - United services union
  // Varies widely by sector, this is an average
  [TariffType.VERDI]: 1050, // 2025: ~1,050 EUR/month
  
  // IG BCE - Mining, chemical, energy
  // Very competitive, chemical industry pays well
  [TariffType.IG_BCE]: 1100, // 2025: ~1,100 EUR/month
  
  // IG BAU - Construction union
  [TariffType.IG_BAU]: 920, // 2025: ~920 EUR/month
  
  // NGG - Food, beverage, hospitality
  // Lower than industrial tariffs
  [TariffType.NGG]: 900, // 2025: ~900 EUR/month
  
  // TVöD - Public sector (federal)
  // Standardized public sector pay
  [TariffType.TVÖD]: 1068, // 2025: TVöD Entgeltgruppe 2, Stufe 1 ~1,068 EUR/month
  
  // TV-L - State public sector
  // Similar to TVöD but slightly varies by state
  [TariffType.TV_L]: 1068, // 2025: ~1,068 EUR/month
  
  // IT Tarifvertrag - IT collective agreement
  // Higher for tech sector
  [TariffType.IT_TARIFVERTRAG]: 1150, // 2025: ~1,150 EUR/month
  
  // Einzelhandel - Retail
  // Lower, varies by state
  [TariffType.EINZELHANDEL]: 850, // 2025: ~850 EUR/month (varies widely)
  
  // Banking - Banking sector
  // Good pay in financial sector
  [TariffType.BANKING]: 1150, // 2025: ~1,150 EUR/month
  
  // Other - Unknown tariff agreement
  // Use conservative estimate
  [TariffType.OTHER]: 950, // Conservative estimate
};

/**
 * Get the standard 1st year salary for a given tariff type
 */
export function getTariffFirstYearSalary(tariffType?: TariffType): number | null {
  if (!tariffType || tariffType === TariffType.NONE) {
    return null;
  }
  
  return TARIFF_FIRST_YEAR_SALARIES[tariffType] || null;
}

/**
 * Salary keywords to search for when scraping company websites
 */
export const SALARY_KEYWORDS_DE = [
  'vergütung',
  'ausbildungsvergütung',
  'gehalt',
  'lehrjahr',
  '1. lehrjahr',
  'erstes lehrjahr',
  '1. ausbildungsjahr',
  'erstes ausbildungsjahr',
  'ausbildungsgehalt',
  'tarifvertrag',
  'tarif',
];

export const SALARY_KEYWORDS_EN = [
  'salary',
  'compensation',
  'first year',
  '1st year',
  'apprenticeship salary',
  'training salary',
];

/**
 * Extract salary amounts from text using regex
 * Handles various German number formats
 */
export function extractSalaryFromText(text: string): number | null {
  // Remove all whitespace for easier matching
  const cleanText = text.toLowerCase().replace(/\s+/g, ' ');
  
  // Pattern 1: "1.150 EUR" or "1.150€" or "1150 Euro"
  const pattern1 = /(\d{1,2})[.,]?(\d{3})\s*(?:eur|€|euro)/gi;
  const matches1 = cleanText.matchAll(pattern1);
  
  for (const match of matches1) {
    const salary = parseInt(match[1] + match[2]);
    // Reasonable range for Ausbildung: 500-2000 EUR/month
    if (salary >= 500 && salary <= 2000) {
      return salary;
    }
  }
  
  // Pattern 2: "1150" without currency but near salary keywords
  const salaryKeywords = [...SALARY_KEYWORDS_DE, ...SALARY_KEYWORDS_EN];
  
  for (const keyword of salaryKeywords) {
    const keywordIndex = cleanText.indexOf(keyword);
    if (keywordIndex !== -1) {
      // Look for numbers within 100 characters of the keyword
      const contextStart = Math.max(0, keywordIndex - 50);
      const contextEnd = Math.min(cleanText.length, keywordIndex + 100);
      const context = cleanText.substring(contextStart, contextEnd);
      
      // Find 3-4 digit numbers in context
      const numberPattern = /\b(\d{3,4})\b/g;
      const numbers = context.matchAll(numberPattern);
      
      for (const numMatch of numbers) {
        const num = parseInt(numMatch[1]);
        if (num >= 500 && num <= 2000) {
          return num;
        }
      }
    }
  }
  
  return null;
}

/**
 * Check if text mentions a specific year (1st, 2nd, 3rd year)
 */
export function isFirstYearSalary(text: string): boolean {
  const lowerText = text.toLowerCase();
  const firstYearPatterns = [
    '1. lehrjahr',
    '1. ausbildungsjahr',
    'erstes lehrjahr',
    'erstes ausbildungsjahr',
    'im ersten jahr',
    'first year',
    '1st year',
  ];
  
  return firstYearPatterns.some(pattern => lowerText.includes(pattern));
}
