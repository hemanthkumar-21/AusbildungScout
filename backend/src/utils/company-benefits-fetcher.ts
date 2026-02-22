/**
 * Company Benefits Fetcher
 * Fetches additional benefits from company career pages and official sources
 * This enhances scraped job data with verified, up-to-date information
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { normalizeBenefits } from './normalizer';
import { extractSalaryFromText, isFirstYearSalary, SALARY_KEYWORDS_DE, SALARY_KEYWORDS_EN } from './tariff-salary-mapper';

interface CompanyBenefitsData {
  benefits: string[];
  benefitTags: string[];
  tariffType?: string;
  firstYearSalary?: number; // Extracted salary from company website
  relocationSupport?: {
    offered: boolean;
    rent_subsidy?: boolean;
    free_accommodation?: boolean;
    moving_cost_covered?: boolean;
    details?: string;
  };
  lastUpdated: Date;
  source: string;
}

/**
 * Fetch company benefits from career page
 * Attempts to find the company's career page and extract benefits information
 */
export async function fetchCompanyBenefits(
  companyName: string,
  existingLink?: string
): Promise<CompanyBenefitsData | null> {
  try {
    // Try to construct career page URL
    const careerPageUrl = await findCompanyCareerPage(companyName, existingLink);
    
    if (!careerPageUrl) {
      console.log(`No career page found for ${companyName}`);
      return null;
    }
    
    // Fetch the page content
    const response = await axios.get(careerPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000 // 10 second timeout
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract benefits from common patterns
    const benefits = extractBenefitsFromHTML($, html);
    
    // Extract tariff information
    const tariffType = extractTariffInfo($, html);
    
    // Extract relocation support details
    const relocationSupport = extractRelocationInfo($, html);
    
    // Extract first year salary
    const firstYearSalary = extractFirstYearSalaryFromHTML($, html);
    
    // Normalize benefits to tags
    const benefitTags = normalizeBenefits(benefits);
    
    return {
      benefits,
      benefitTags,
      ...(tariffType && { tariffType }),
      ...(firstYearSalary && { firstYearSalary }),
      ...(relocationSupport && { relocationSupport }),
      lastUpdated: new Date(),
      source: careerPageUrl
    };
    
  } catch (error) {
    console.error(`Error fetching benefits for ${companyName}:`, error);
    return null;
  }
}

/**
 * Find company career page URL
 * Uses various strategies to locate the company's career/jobs page
 */
async function findCompanyCareerPage(
  companyName: string,
  existingLink?: string
): Promise<string | null> {
  // If we have an existing link from the job posting, try to derive career page
  if (existingLink) {
    try {
      const url = new URL(existingLink);
      const domain = url.hostname;
      
      // Common career page patterns
      const careerPaths = [
        '/karriere',
        '/career',
        '/careers',
        '/jobs',
        '/ausbildung',
        '/benefits',
        '/ueber-uns/karriere'
      ];
      
      // Try each path
      for (const path of careerPaths) {
        const careerUrl = `${url.protocol}//${domain}${path}`;
        const exists = await checkUrlExists(careerUrl);
        if (exists) {
          return careerUrl;
        }
      }
    } catch (error) {
      // Invalid URL, continue
    }
  }
  
  // Could implement Google search API here to find career page
  // For now, return null if we can't derive from existing link
  return null;
}

/**
 * Check if a URL exists (returns 200)
 */
async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      maxRedirects: 3
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Extract benefits from HTML content
 * Looks for common benefit-related sections and keywords
 */
function extractBenefitsFromHTML($: cheerio.CheerioAPI, html: string): string[] {
  const benefits: Set<string> = new Set();
  
  // Benefit-related keywords to search for
  const benefitSections = [
    'benefits', 'vorteile', 'leistungen', 'was wir bieten',
    'deine vorteile', 'unsere benefits', 'das bieten wir'
  ];
  
  // Find sections that might contain benefits
  $('h1, h2, h3, h4, h5, h6').each((_: number, element: any) => {
    const headingText = $(element).text().toLowerCase();
    
    if (benefitSections.some(keyword => headingText.includes(keyword))) {
      // Extract benefits from the next sibling elements
      let nextElement = $(element).next();
      let count = 0;
      
      while (nextElement.length && count < 10) {
        const tagName = nextElement.prop('tagName')?.toLowerCase();
        
        if (tagName === 'ul' || tagName === 'ol') {
          // Extract list items
          nextElement.find('li').each((_: number, li: any) => {
            const text = $(li).text().trim();
            if (text.length > 3 && text.length < 150) {
              benefits.add(text);
            }
          });
        } else if (tagName === 'p' || tagName === 'div') {
          const text = nextElement.text().trim();
          if (text.length > 3 && text.length < 150) {
            // Check if it looks like a benefit
            if (isBenefitText(text)) {
              benefits.add(text);
            }
          }
        } else if (tagName && tagName.match(/^h[1-6]$/)) {
          // Stop if we hit another heading
          break;
        }
        
        nextElement = nextElement.next();
        count++;
      }
    }
  });
  
  return Array.from(benefits);
}

/**
 * Check if text looks like a benefit description
 */
function isBenefitText(text: string): boolean {
  const benefitKeywords = [
    'urlaub', 'vacation', 'gehalt', 'salary', 'bonus', 'home office',
    'laptop', 'gym', 'fitness', 'training', 'weiterbildung', 'fortbildung',
    'altersvorsorge', 'pension', 'ticket', 'kantine', 'obst', 'getränke',
    'flexibel', 'flexible', 'gleitzeit', 'parking', 'parkplatz'
  ];
  
  const lowerText = text.toLowerCase();
  return benefitKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract tariff information from HTML
 */
function extractTariffInfo($: cheerio.CheerioAPI, html: string): string | undefined {
  const tariffKeywords = [
    'ig metall', 'verdi', 'ig bce', 'ig bau', 'ngg',
    'tvöd', 'tv-l', 'tarifvertrag', 'tarifgebunden'
  ];
  
  const bodyText = $('body').text().toLowerCase();
  
  for (const keyword of tariffKeywords) {
    if (bodyText.includes(keyword)) {
      return keyword;
    }
  }
  
  return undefined;
}

/**
 * Extract relocation support information
 */
function extractRelocationInfo($: cheerio.CheerioAPI, html: string): any {
  const bodyText = $('body').text().toLowerCase();
  
  const relocationSupport: any = {
    offered: false
  };
  
  // Check for relocation-related keywords
  const relocationKeywords = {
    general: ['relocation', 'umzug', 'umsiedlung', 'relocation support'],
    rent: ['rent subsidy', 'mietbeihilfe', 'mietzuschuss', 'wohnungssuche'],
    accommodation: ['free accommodation', 'kostenlose unterkunft', 'housing', 'wohnung'],
    moving: ['moving costs', 'umzugskosten', 'relocation package']
  };
  
  if (relocationKeywords.general.some(kw => bodyText.includes(kw))) {
    relocationSupport.offered = true;
  }
  
  if (relocationKeywords.rent.some(kw => bodyText.includes(kw))) {
    relocationSupport.rent_subsidy = true;
    relocationSupport.offered = true;
  }
  
  if (relocationKeywords.accommodation.some(kw => bodyText.includes(kw))) {
    relocationSupport.free_accommodation = true;
    relocationSupport.offered = true;
  }
  
  if (relocationKeywords.moving.some(kw => bodyText.includes(kw))) {
    relocationSupport.moving_cost_covered = true;
    relocationSupport.offered = true;
  }
  
  return relocationSupport.offered ? relocationSupport : undefined;
}

/**
 * Extract first year Ausbildung salary from HTML
 * Looks for salary information related to 1st year training
 */
function extractFirstYearSalaryFromHTML($: cheerio.CheerioAPI, html: string): number | null {
  const bodyText = $('body').text().toLowerCase();
  
  // Build a list of text blocks that mention first year
  const textBlocks: string[] = [];
  
  // Look for sections mentioning salary in headers
  $('h1, h2, h3, h4, h5, h6, p, li, div, span').each((_: number, element: any) => {
    const text = $(element).text();
    const lowerText = text.toLowerCase();
    
    // Check if this block mentions first year salary keywords
    const hasSalaryKeyword = [...SALARY_KEYWORDS_DE, ...SALARY_KEYWORDS_EN].some(
      kw => lowerText.includes(kw)
    );
    
    if (hasSalaryKeyword && isFirstYearSalary(text)) {
      textBlocks.push(text);
    }
  });
  
  // Try to extract salary from first year specific blocks
  for (const block of textBlocks) {
    const salary = extractSalaryFromText(block);
    if (salary) {
      console.log(`Extracted first year salary: ${salary} EUR from company website`);
      return salary;
    }
  }
  
  // Fallback: search the entire body text for first year salary patterns
  // Split text into sentences/paragraphs
  const sentences = bodyText.split(/[.!?\n]/);
  
  for (const sentence of sentences) {
    if (isFirstYearSalary(sentence)) {
      const salary = extractSalaryFromText(sentence);
      if (salary) {
        console.log(`Extracted first year salary: ${salary} EUR from company website (fallback)`);
        return salary;
      }
    }
  }
  
  return null;
}

/**
 * Update job benefits from company website
 * This function can be called periodically to refresh benefits data
 */
export async function updateJobBenefitsFromCompany(
  job: any
): Promise<Partial<any> | null> {
  const companyData = await fetchCompanyBenefits(
    job.company_name,
    job.original_link
  );
  
  if (!companyData) {
    return null;
  }
  
  // Merge with existing benefits
  const existingBenefits = job.benefits || [];
  const newBenefits = [...new Set([...existingBenefits, ...companyData.benefits])];
  
  const existingTags = job.benefits_tags || [];
  const newTags = [...new Set([...existingTags, ...companyData.benefitTags])];
  
  return {
    benefits: newBenefits,
    benefits_tags: newTags,
    benefits_verified: true,
    benefits_last_updated: companyData.lastUpdated,
    ...(companyData.tariffType && !job.tariff_type && { tariff_type: companyData.tariffType }),
    ...(companyData.relocationSupport && { 
      relocation_support: {
        ...(job.relocation_support || {}),
        ...companyData.relocationSupport
      }
    })
  };
}
