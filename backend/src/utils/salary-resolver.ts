/**
 * Salary Resolution Utility
 * Handles the complex logic for determining first year Ausbildung salary
 * Priority: Scraped data > Description parsing > Company website > Tariff standard > null
 * 
 * Rules:
 * - 1st year: Should be filled 99% of the time (only null if truly no info)
 * - 3rd year: Can be null (optional)
 */

import { TariffType } from '@/types';
import { getTariffFirstYearSalary } from './tariff-salary-mapper';
import { fetchCompanyBenefits } from './company-benefits-fetcher';

export interface SalaryResolutionResult {
  firstYearSalary?: number;
  thirdYearSalary?: number;
  average?: number;
  source: 'scraped' | 'description_parsed' | 'company_website' | 'tariff_standard' | 'none';
  tariffUsed?: TariffType;
  confidence?: 'high' | 'medium' | 'low'; // How confident we are about this salary
}

/**
 * Extract salary amounts from German text descriptions
 * Handles various formats: "1.200€", "1200 Euro", "1,200", "ab 1.200", etc.
 * Returns { first_year, third_year } if found
 */
export function extractSalaryFromDescription(
  description?: string
): { firstYear?: number; thirdYear?: number } {
  if (!description) {
    return {};
  }

  const text = description.toLowerCase();
  const result: { firstYear?: number; thirdYear?: number } = {};

  // German salary amount patterns - handles . as thousands separator and , as decimal
  // Patterns: "1.200€", "1.200 euro", "1200 euro", "€1.200", "1,200€", etc.
  const salaryPattern = /(?:ab\s+|ca\.\s+|ca\s+|rund\s+)?(?:€\s*|eur\s+)?(\d{1,2}[.,]\d{3}(?:[.,]\d{2})?|\d{3,5})\s*(?:€|euro|eur)?/gi;

  // Year/Lehrjahr patterns to identify which year a salary belongs to
  const firstYearPatterns = [
    /(?:1\.\s*)?(?:lehr|ausbildungs)?jahr\s*[:)]?\s*(?:ab\s+)?(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
    /(?:erstes\s+)?(?:lehrjahr|ausbildungsjahr)\s*[:)]?\s*(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
    /vergütung\s+1\.\s*jahr\s*[:)]?\s*(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
  ];

  const thirdYearPatterns = [
    /3\.\s*(?:lehr|ausbildungs)?jahr\s*[:)]?\s*(?:ab\s+)?(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
    /drittes?\s+(?:lehrjahr|ausbildungsjahr)\s*[:)]?\s*(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
    /vergütung\s+3\.\s*jahr\s*[:)]?\s*(?:€\s*)?(\d{1,2}[.,]\d{3})/gi,
  ];

  // Try to find explicit year-based salaries first (highest confidence)
  for (const pattern of firstYearPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      result.firstYear = parseGermanNumber(match[1]);
      break;
    }
  }

  for (const pattern of thirdYearPatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      result.thirdYear = parseGermanNumber(match[1]);
      break;
    }
  }

  // If no explicit year found but pattern exists, collect likely salaries
  // Usually the first one mentioned is 1st year
  if (!result.firstYear) {
    const allMatches = [...text.matchAll(salaryPattern)];
    
    if (allMatches.length > 0) {
      const firstMatch = allMatches[0];
      if (firstMatch && firstMatch[1]) {
        // First salary found is likely 1st year
        result.firstYear = parseGermanNumber(firstMatch[1]);
        
        // If multiple salaries found, last one might be 3rd year
        if (allMatches.length > 1 && !result.thirdYear) {
          const lastMatch = allMatches[allMatches.length - 1];
          if (lastMatch && lastMatch[1]) {
            const lastSalary = parseGermanNumber(lastMatch[1]);
            // Only consider it 3rd year if significantly higher
            if (lastSalary > (result.firstYear * 1.15)) {
              result.thirdYear = lastSalary;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Convert German number format to standard number
 * "1.200,50" -> 1200.50
 * "1,200.50" -> 1200.50
 * "1200" -> 1200
 */
export function parseGermanNumber(numStr: string): number {
  if (!numStr) return 0;

  // Remove spaces
  numStr = numStr.trim();

  // Determine if "." is thousands separator or decimal
  const lastDot = numStr.lastIndexOf('.');
  const lastComma = numStr.lastIndexOf(',');

  let normalizedNum = numStr;

  if (lastDot > lastComma) {
    // "1.200,50" format: remove dots, keep comma as decimal
    // But for salary, we usually don't have decimals, so just remove the dot
    normalizedNum = numStr.replace(/\./g, '');
    normalizedNum = normalizedNum.replace(',', '');
  } else if (lastComma > lastDot) {
    // "1,200.50" format (less common in Germany)
    normalizedNum = numStr.replace(/,/g, '');
  } else if (lastDot >= 0) {
    // Only dots exist
    if (numStr.split('.').length === 2) {
      // Single dot - likely decimal
      normalizedNum = numStr;
    } else {
      // Multiple dots - thousands separators
      normalizedNum = numStr.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(normalizedNum);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Resolve first year salary using the following priority:
 * 1. If scraped data has salary -> use it
 * 2. If no scraped salary, try parsing from description
 * 3. If no parsed salary but has tariff:
 *    a. Try to fetch from company website
 *    b. If not found, use tariff standard salary
 * 4. If no tariff and no scraped salary -> leave blank (null)
 */
export async function resolveFirstYearSalary(
  scrapedFirstYear?: number,
  scrapedThirdYear?: number,
  tariffType?: TariffType,
  companyName?: string,
  originalLink?: string,
  descriptionFull?: string
): Promise<SalaryResolutionResult> {
  
  // Helper to validate and convert annual to monthly if needed
  const normalizeToMonthly = (salary: number | undefined): number | undefined => {
    if (!salary || salary <= 0) return undefined;
    
    // If salary is > 8000, it's likely annual - convert to monthly
    if (salary > 8000) {
      const monthly = Math.round(salary / 12);
      console.log(`[Salary] Converting annual ${salary} EUR to monthly: ${monthly} EUR/month`);
      return monthly;
    }
    
    return salary;
  };
  
  // Priority 1: Use scraped data if available (but validate monthly format)
  const monthlyScrapedFirstYear = normalizeToMonthly(scrapedFirstYear);
  if (monthlyScrapedFirstYear && monthlyScrapedFirstYear > 0) {
    console.log(`[Salary] Using scraped first year salary: ${monthlyScrapedFirstYear} EUR/month`);
    const monthlyScrapedThirdYear = normalizeToMonthly(scrapedThirdYear);
    return {
      firstYearSalary: monthlyScrapedFirstYear,
      ...(monthlyScrapedThirdYear && { thirdYearSalary: monthlyScrapedThirdYear }),
      average: monthlyScrapedThirdYear 
        ? Math.round((monthlyScrapedFirstYear + monthlyScrapedThirdYear) / 2)
        : monthlyScrapedFirstYear,
      source: 'scraped',
      confidence: 'high'
    };
  }
  
  // Priority 2: Try extracting from description
  if (descriptionFull) {
    const parsed = extractSalaryFromDescription(descriptionFull);
    const monthlyFirstYear = normalizeToMonthly(parsed.firstYear);
    if (monthlyFirstYear && monthlyFirstYear > 0) {
      const monthlyThirdYear = normalizeToMonthly(parsed.thirdYear);
      console.log(`[Salary] Extracted from description: ${monthlyFirstYear} EUR/month (1st year)`);
      return {
        firstYearSalary: monthlyFirstYear,
        ...(monthlyThirdYear && { thirdYearSalary: monthlyThirdYear }),
        ...(monthlyFirstYear && monthlyThirdYear && { average: Math.round((monthlyFirstYear + monthlyThirdYear) / 2) }),
        source: 'description_parsed',
        confidence: 'medium'
      };
    }
  }
  
  // No scraped or parsed salary - check if there's a tariff
  if (!tariffType || tariffType === TariffType.NONE) {
    console.log(`[Salary] No salary information found for ${companyName}`);
    return {
      source: 'none'
    };
  }
  
  // Has tariff but no scraped/parsed salary
  console.log(`[Salary] No direct salary but has tariff: ${tariffType} for ${companyName}`);
  
  // Priority 3a: Try to fetch from company website
  if (companyName && originalLink) {
    console.log(`[Salary] Attempting to fetch salary from company website...`);
    try {
      const companyData = await fetchCompanyBenefits(companyName, originalLink);
      
      if (companyData?.firstYearSalary && companyData.firstYearSalary > 0) {
        console.log(`[Salary] Found salary on company website: ${companyData.firstYearSalary} EUR`);
        return {
          firstYearSalary: companyData.firstYearSalary,
          ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
          average: scrapedThirdYear
            ? Math.round((companyData.firstYearSalary + scrapedThirdYear) / 2)
            : companyData.firstYearSalary,
          source: 'company_website',
          confidence: 'high',
          tariffUsed: tariffType
        };
      }
      
      console.log(`[Salary] No salary found on company website`);
    } catch (error) {
      console.warn(`[Salary] Error fetching from company website:`, error);
    }
  }
  
  // Priority 3b: Use tariff standard salary
  const tariffSalary = getTariffFirstYearSalary(tariffType);
  
  if (tariffSalary && tariffSalary > 0) {
    console.log(`[Salary] Using tariff standard salary: ${tariffSalary} EUR for ${tariffType}`);
    return {
      firstYearSalary: tariffSalary,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear
        ? Math.round((tariffSalary + scrapedThirdYear) / 2)
        : tariffSalary,
      source: 'tariff_standard',
      confidence: 'medium',
      tariffUsed: tariffType
    };
  }
  
  // Tariff exists but no standard salary defined
  console.log(`[Salary] Tariff ${tariffType} has no standard salary defined - leaving blank`);
  return {
    source: 'none',
    tariffUsed: tariffType
  };
}

/**
 * Simplified version for batch processing (skips company website check)
 * Use this when processing many jobs at once to avoid rate limiting
 */
export function resolveFirstYearSalaryFast(
  scrapedFirstYear?: number,
  scrapedThirdYear?: number,
  tariffType?: TariffType,
  descriptionFull?: string
): SalaryResolutionResult {
  
  // Helper to validate and convert annual to monthly if needed
  const normalizeToMonthly = (salary: number | undefined): number | undefined => {
    if (!salary || salary <= 0) return undefined;
    
    // If salary is > 8000, it's likely annual - convert to monthly
    if (salary > 8000) {
      const monthly = Math.round(salary / 12);
      console.log(`[Salary] Converting annual ${salary} EUR to monthly: ${monthly} EUR/month`);
      return monthly;
    }
    
    return salary;
  };
  
  // Use scraped data if available (but validate monthly format)
  const monthlyScrapedFirstYear = normalizeToMonthly(scrapedFirstYear);
  if (monthlyScrapedFirstYear && monthlyScrapedFirstYear > 0) {
    const monthlyScrapedThirdYear = normalizeToMonthly(scrapedThirdYear);
    return {
      firstYearSalary: monthlyScrapedFirstYear,
      ...(monthlyScrapedThirdYear && { thirdYearSalary: monthlyScrapedThirdYear }),
      average: monthlyScrapedThirdYear 
        ? Math.round((monthlyScrapedFirstYear + monthlyScrapedThirdYear) / 2)
        : monthlyScrapedFirstYear,
      source: 'scraped',
      confidence: 'high'
    };
  }
  
  // Try to extract from description
  if (descriptionFull) {
    const parsed = extractSalaryFromDescription(descriptionFull);
    const monthlyFirstYear = normalizeToMonthly(parsed.firstYear);
    if (monthlyFirstYear && monthlyFirstYear > 0) {
      const monthlyThirdYear = normalizeToMonthly(parsed.thirdYear);
      return {
        firstYearSalary: monthlyFirstYear,
        ...(monthlyThirdYear && { thirdYearSalary: monthlyThirdYear }),
        ...(monthlyFirstYear && monthlyThirdYear && { average: Math.round((monthlyFirstYear + monthlyThirdYear) / 2) }),
        source: 'description_parsed',
        confidence: 'medium'
      };
    }
  }
  
  // No tariff or NONE tariff -> leave blank
  if (!tariffType || tariffType === TariffType.NONE) {
    return { source: 'none' };
  }
  
  // Use tariff standard
  const tariffSalary = getTariffFirstYearSalary(tariffType);
  
  if (tariffSalary && tariffSalary > 0) {
    return {
      firstYearSalary: tariffSalary,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear
        ? Math.round((tariffSalary + scrapedThirdYear) / 2)
        : tariffSalary,
      source: 'tariff_standard',
      confidence: 'medium',
      tariffUsed: tariffType
    };
  }
  
  return { source: 'none', tariffUsed: tariffType };
}
