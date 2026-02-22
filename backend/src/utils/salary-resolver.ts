/**
 * Salary Resolution Utility
 * Handles the complex logic for determining first year Ausbildung salary
 * Priority: Scraped data > Company website > Tariff standard > null
 */

import { TariffType } from '@/types';
import { getTariffFirstYearSalary } from './tariff-salary-mapper';
import { fetchCompanyBenefits } from './company-benefits-fetcher';

export interface SalaryResolutionResult {
  firstYearSalary?: number;
  thirdYearSalary?: number;
  average?: number;
  source: 'scraped' | 'company_website' | 'tariff_standard' | 'none';
  tariffUsed?: TariffType;
}

/**
 * Resolve first year salary using the following priority:
 * 1. If scraped data has salary -> use it
 * 2. If no scraped salary but has tariff:
 *    a. Try to fetch from company website
 *    b. If not found, use tariff standard salary
 * 3. If no tariff and no scraped salary -> leave blank (null)
 */
export async function resolveFirstYearSalary(
  scrapedFirstYear?: number,
  scrapedThirdYear?: number,
  tariffType?: TariffType,
  companyName?: string,
  originalLink?: string
): Promise<SalaryResolutionResult> {
  
  // Priority 1: Use scraped data if available
  if (scrapedFirstYear) {
    console.log(`[Salary] Using scraped first year salary: ${scrapedFirstYear} EUR`);
    return {
      firstYearSalary: scrapedFirstYear,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear 
        ? Math.round((scrapedFirstYear + scrapedThirdYear) / 2)
        : scrapedFirstYear,
      source: 'scraped'
    };
  }
  
  // No scraped salary - check if there's a tariff
  if (!tariffType || tariffType === TariffType.NONE) {
    console.log(`[Salary] No scraped salary and no tariff - leaving blank for ${companyName}`);
    return {
      source: 'none'
    };
  }
  
  // Has tariff but no scraped salary
  console.log(`[Salary] No scraped salary but has tariff: ${tariffType} for ${companyName}`);
  
  // Priority 2a: Try to fetch from company website
  if (companyName && originalLink) {
    console.log(`[Salary] Attempting to fetch salary from company website...`);
    try {
      const companyData = await fetchCompanyBenefits(companyName, originalLink);
      
      if (companyData?.firstYearSalary) {
        console.log(`[Salary] Found salary on company website: ${companyData.firstYearSalary} EUR`);
        return {
          firstYearSalary: companyData.firstYearSalary,
          ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
          average: scrapedThirdYear
            ? Math.round((companyData.firstYearSalary + scrapedThirdYear) / 2)
            : companyData.firstYearSalary,
          source: 'company_website',
          tariffUsed: tariffType
        };
      }
      
      console.log(`[Salary] No salary found on company website`);
    } catch (error) {
      console.warn(`[Salary] Error fetching from company website:`, error);
    }
  }
  
  // Priority 2b: Use tariff standard salary
  const tariffSalary = getTariffFirstYearSalary(tariffType);
  
  if (tariffSalary) {
    console.log(`[Salary] Using tariff standard salary: ${tariffSalary} EUR for ${tariffType}`);
    return {
      firstYearSalary: tariffSalary,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear
        ? Math.round((tariffSalary + scrapedThirdYear) / 2)
        : tariffSalary,
      source: 'tariff_standard',
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
  tariffType?: TariffType
): SalaryResolutionResult {
  
  // Use scraped data if available
  if (scrapedFirstYear) {
    return {
      firstYearSalary: scrapedFirstYear,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear 
        ? Math.round((scrapedFirstYear + scrapedThirdYear) / 2)
        : scrapedFirstYear,
      source: 'scraped'
    };
  }
  
  // No tariff or NONE tariff -> leave blank
  if (!tariffType || tariffType === TariffType.NONE) {
    return { source: 'none' };
  }
  
  // Use tariff standard
  const tariffSalary = getTariffFirstYearSalary(tariffType);
  
  if (tariffSalary) {
    return {
      firstYearSalary: tariffSalary,
      ...(scrapedThirdYear && { thirdYearSalary: scrapedThirdYear }),
      average: scrapedThirdYear
        ? Math.round((tariffSalary + scrapedThirdYear) / 2)
        : tariffSalary,
      source: 'tariff_standard',
      tariffUsed: tariffType
    };
  }
  
  return { source: 'none', tariffUsed: tariffType };
}
