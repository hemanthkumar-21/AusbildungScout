/**
 * Gemini AI Pipeline (Phase B)
 * Converts raw German HTML text into structured JSON data
 */

import { IJob, GermanLevel, EducationLevel, TariffType, IRelocationSupport } from '@/types';
import {
  normalizeBenefits,
  normalizeTechStack,
  calculateSalaryAverage,
  normalizeDate,
} from './normalizer';
import { resolveFirstYearSalaryFast } from './salary-resolver';

interface AIResponse {
  job_title: string;
  company_name: string;
  job_title_de?: string;
  locations: Array<{ city: string; zip_code?: string; address?: string; state?: string }>;
  start_date?: string;
  duration_months?: number;
  application_deadline?: string;
  available_positions?: number;
  german_level_requirement?: string;
  english_level_requirement?: string;
  education_required?: string;
  tech_stack?: string[];
  driving_license_required?: boolean;
  salary?: {
    firstYearSalary?: number;
    thirdYearSalary?: number;
  };
  salary_min?: number;
  salary_max?: number;
  tarifvertrag_only?: boolean;
  tariff_type?: string; // New: Tariff/Union information
  visa_sponsorship?: boolean;
  relocation_support?: {
    offered?: boolean;
    rent_subsidy?: boolean;
    free_accommodation?: boolean;
    moving_cost_covered?: boolean;
    temporary_housing?: boolean;
    relocation_bonus?: number;
    details?: string;
  };
  benefits?: string[];
  description_snippet?: string;
  contact_person?: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
  };
}

// Language level mapping rules
function mapGermanLevel(input?: string | null): GermanLevel {
  if (!input || input === 'null' || input === 'not mentioned' || input === 'none' || input === 'None') {
    // CRITICAL RULE: If no language level mentioned, return None (not mentioned)
    return GermanLevel.NONE;
  }
  
  const lower = input.toLowerCase();
  
  if (lower.includes('muttersprache') || lower.includes('native') || lower.includes('fluent')) {
    return GermanLevel.C2;
  }
  if (lower.includes('c2')) {
    return GermanLevel.C2;
  }
  if (lower.includes('c1')) {
    return GermanLevel.C1;
  }
  if (lower.includes('verhandlungssicher')) {
    return GermanLevel.C1;
  }
  if (lower.includes('b2')) {
    return GermanLevel.B2;
  }
  if (lower.includes('good') || lower.includes('sehr gut') || lower.includes('gut')) {
    return GermanLevel.B2;
  }
  if (lower.includes('b1')) {
    return GermanLevel.B1;
  }
  if (lower.includes('intermediate') || lower.includes('mittelstufe')) {
    return GermanLevel.B1;
  }
  if (lower.includes('a2')) {
    return GermanLevel.A2;
  }
  if (lower.includes('a1')) {
    return GermanLevel.A1;
  }
  
  // Default to NONE if we can't parse
  return GermanLevel.NONE;
}

function mapEducationLevel(input?: string): EducationLevel {
  if (!input) {
    return EducationLevel.REALSCHULE;
  }
  
  const lower = input.toLowerCase();
  
  if (lower.includes('abitur') && !lower.includes('fach')) {
    return EducationLevel.ABITUR;
  }
  if (lower.includes('fachabitur')) {
    return EducationLevel.FACHABITUR;
  }
  if (lower.includes('realschule')) {
    return EducationLevel.REALSCHULE;
  }
  if (lower.includes('hauptschule')) {
    return EducationLevel.HAUPTSCHULE;
  }
  if (lower.includes('keine') || lower.includes('none')) {
    return EducationLevel.NONE;
  }
  
  return EducationLevel.REALSCHULE;
}

function mapTariffType(input?: string): TariffType {
  if (!input || input === 'null' || input === 'not mentioned' || input === 'none' || input === 'None') {
    return TariffType.NONE;
  }
  
  const lower = input.toLowerCase();
  
  if (lower.includes('ig metall') || lower.includes('metall')) {
    return TariffType.IG_METALL;
  }
  if (lower.includes('ver.di') || lower.includes('verdi')) {
    return TariffType.VERDI;
  }
  if (lower.includes('ig bce') || lower.includes('chemie') || lower.includes('bergbau')) {
    return TariffType.IG_BCE;
  }
  if (lower.includes('ig bau') || lower.includes('bau')) {
    return TariffType.IG_BAU;
  }
  if (lower.includes('ngg') || lower.includes('nahrung')) {
    return TariffType.NGG;
  }
  if (lower.includes('tvöd') || lower.includes('öffentlich')) {
    return TariffType.TVÖD;
  }
  if (lower.includes('tv-l') || lower.includes('länder')) {
    return TariffType.TV_L;
  }
  if (lower.includes('it tarif') || lower.includes('it-tarif')) {
    return TariffType.IT_TARIFVERTRAG;
  }
  if (lower.includes('einzelhandel') || lower.includes('handel')) {
    return TariffType.EINZELHANDEL;
  }
  if (lower.includes('bank') || lower.includes('sparkasse')) {
    return TariffType.BANKING;
  }
  if (lower.includes('tarif')) {
    return TariffType.OTHER;
  }
  
  return TariffType.NONE;
}

/**
 * Process AI response and normalize it to match our schema
 */
export async function processAIResponse(
  aiResponse: AIResponse,
  originalUrl: string,
  sourcePlatform: string = 'ausbildung.de'
): Promise<Partial<IJob> | null> {
  try {
    // Validate required fields
    if (!aiResponse.job_title || !aiResponse.company_name || !aiResponse.locations?.length) {
      console.warn('AI response missing required fields');
      return null;
    }
    
    // Parse dates
    const startDate = aiResponse.start_date
      ? normalizeDate(aiResponse.start_date)
      : undefined;
    const deadline = aiResponse.application_deadline
      ? normalizeDate(aiResponse.application_deadline)
      : undefined;
    
    // Calculate salary average
    const salaryAverage = calculateSalaryAverage(
      aiResponse.salary_min,
      aiResponse.salary_max,
      aiResponse.tarifvertrag_only
    );
    
    // Normalize benefits
    const benefitsTags = normalizeBenefits(aiResponse.benefits || []);
    
    // Normalize tech stack
    const techStack = normalizeTechStack(aiResponse.tech_stack || []);
    
    // Visa sponsorship: Only true if specific keywords present
    const hasVisaKeywords = aiResponse.description_snippet
      ? [
          'relocation support',
          'visa assistance',
          'international applicants',
          'blue card',
          'relocation',
          'umsiedlung',
        ].some(keyword => 
          aiResponse.description_snippet!.toLowerCase().includes(keyword)
        )
      : false;
    
    const visaSponsorship = aiResponse.visa_sponsorship || hasVisaKeywords;
    
    // Map tariff type first (needed for salary resolution)
    const tariffType = mapTariffType(aiResponse.tariff_type);
    
    // Resolve salary using priority: scraped > tariff standard > null
    // Note: This uses the fast resolver (no company website check) for initial processing
    // A separate background job can later fetch from company websites
    const salaryResolution = resolveFirstYearSalaryFast(
      aiResponse.salary?.firstYearSalary,
      aiResponse.salary?.thirdYearSalary,
      tariffType
    );
    
    // Build salary object
    const salaryObj: any = {
      currency: 'EUR',
    };
    
    if (salaryResolution.firstYearSalary !== undefined) {
      salaryObj.firstYearSalary = salaryResolution.firstYearSalary;
      console.log(`[Salary] Set firstYearSalary from ${salaryResolution.source}: ${salaryResolution.firstYearSalary} EUR`);
    }
    if (salaryResolution.thirdYearSalary !== undefined) {
      salaryObj.thirdYearSalary = salaryResolution.thirdYearSalary;
    }
    if (salaryResolution.average !== undefined) {
      salaryObj.average = salaryResolution.average;
    } else if (salaryAverage !== undefined) {
      // Fallback to old calculation if resolver didn't provide average
      salaryObj.average = salaryAverage;
    }
    
    // Process relocation support
    const relocationSupportObj: IRelocationSupport = {
      offered: aiResponse.relocation_support?.offered || false,
      ...(aiResponse.relocation_support?.rent_subsidy && { rent_subsidy: aiResponse.relocation_support.rent_subsidy }),
      ...(aiResponse.relocation_support?.free_accommodation && { free_accommodation: aiResponse.relocation_support.free_accommodation }),
      ...(aiResponse.relocation_support?.moving_cost_covered && { moving_cost_covered: aiResponse.relocation_support.moving_cost_covered }),
      ...(aiResponse.relocation_support?.temporary_housing && { temporary_housing: aiResponse.relocation_support.temporary_housing }),
      ...(aiResponse.relocation_support?.relocation_bonus && { relocation_bonus: aiResponse.relocation_support.relocation_bonus }),
      ...(aiResponse.relocation_support?.details && { details: aiResponse.relocation_support.details }),
    };
    
    const normalizedJob: Partial<IJob> = {
      job_title: aiResponse.job_title,
      company_name: aiResponse.company_name,
      locations: aiResponse.locations,
      ...(startDate && { start_date: startDate }),
      ...(aiResponse.duration_months && { duration_months: aiResponse.duration_months }),
      ...(deadline && { application_deadline: deadline }),
      ...(aiResponse.available_positions && { available_positions: aiResponse.available_positions }),
      german_level_requirement: mapGermanLevel(aiResponse.german_level_requirement),
      english_level_requirement: mapGermanLevel(aiResponse.english_level_requirement),
      education_required: mapEducationLevel(aiResponse.education_required),
      ...(techStack.length > 0 && { tech_stack: techStack }),
      ...(aiResponse.driving_license_required && { driving_license_required: aiResponse.driving_license_required }),
      salary: salaryObj,
      tariff_type: tariffType,
      visa_sponsorship: visaSponsorship,
      relocation_support: relocationSupportObj,
      ...(aiResponse.benefits && aiResponse.benefits.length > 0 && { benefits: aiResponse.benefits }),
      ...(benefitsTags.length > 0 && { benefits_tags: benefitsTags }),
      ...(aiResponse.description_snippet && { description_snippet: aiResponse.description_snippet }),
      original_link: originalUrl,
      source_platform: sourcePlatform,
      posted_at: new Date(),
      ...(aiResponse.contact_person && { contact_person: aiResponse.contact_person }),
    };
    
    return normalizedJob;
  } catch (error) {
    console.error('Error processing AI response:', error);
    return null;
  }
}

/**
 * Create a prompt for Gemini to analyze German job descriptions
 */
export function createJobAnalysisPrompt(htmlText: string): string {
  return `
You are a German job market expert. Extract structured data from this German job posting.

Rules:
1. German language level: Map text to A1, A2, B1, B2, C1, C2, or null (not mentioned).
   - If NO language level is explicitly mentioned in the posting, respond with null (NOT "not mentioned" as a string).
   - "Good German" = B2
   - "Fluent/Native" = C2
   
2. Salary: Extract only firstYearSalary and thirdYearSalary when available.
   If only "Tarifvertrag" is mentioned, return null (don't guess).

3. Tariff Type: Identify collective bargaining agreement (Tarifvertrag) if mentioned:
   - "IG Metall" for metal/electrical engineering
   - "ver.di" for services union
   - "IG BCE" for chemical/mining/energy
   - "IG BAU" for construction
   - "NGG" for food/beverage/hospitality
   - "TVöD" for public sector
   - "TV-L" for state public sector
   - "Banking" for banking sector
   - "Other" for other tariff agreements
   - null if not mentioned

4. Visa sponsorship: Set to true ONLY if these keywords appear:
   "Relocation support", "Visa assistance", "International applicants welcome", "Blue Card"
   Otherwise, false.

5. Relocation Support: Extract detailed relocation information:
   - offered: true if ANY relocation support mentioned
   - rent_subsidy: true if rent assistance/subsidy mentioned
   - free_accommodation: true if free housing/lodging provided
   - moving_cost_covered: true if moving/relocation costs reimbursed
   - temporary_housing: true if temporary accommodation provided
   - relocation_bonus: extract amount in EUR if mentioned
   - details: any additional relocation information

6. Education level: Map to Hauptschulabschluss, Realschulabschluss, Abitur, Fachabitur, or null.

7. Tech stack: Lowercase, remove duplicates, return empty array if none mentioned.

8. Benefits: Extract ALL benefits mentioned (e.g., "30 Tage Urlaub", "Kostenlos Kaffee", "Betriebliche Altersvorsorge", "Weiterbildung", "HomeOffice"), empty array if none.

9. Dates: Standardize to ISO format (YYYY-MM-DD).

10. All optional fields (like english_level_requirement, german_level_requirement): use null if not mentioned, NOT empty strings.

Response as JSON (no markdown, raw JSON only):
{
  "job_title": "string",
  "company_name": "string",
  "locations": [{ "city": "string", "zip_code": "string or null", "address": "string or null", "state": "string" }],
  "start_date": "DD.MM.YYYY or similar or null",
  "duration_months": 36 or null,
  "application_deadline": "DD.MM.YYYY or similar or null",
  "available_positions": number or null,
  "german_level_requirement": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null,
  "english_level_requirement": "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null,
  "education_required": "Hauptschulabschluss" | "Realschulabschluss" | "Abitur" | "Fachabitur" | null,
  "tech_stack": ["string"] or [],
  "driving_license_required": boolean or null,
  "salary": {
    "firstYearSalary": number or null,
    "thirdYearSalary": number or null
  },
  "tariff_type": "IG Metall" | "ver.di" | "IG BCE" | "IG BAU" | "NGG" | "TVöD" | "TV-L" | "Banking" | "Other" | null,
  "visa_sponsorship": boolean,
  "relocation_support": {
    "offered": boolean,
    "rent_subsidy": boolean or null,
    "free_accommodation": boolean or null,
    "moving_cost_covered": boolean or null,
    "temporary_housing": boolean or null,
    "relocation_bonus": number or null,
    "details": "string or null"
  },
  "benefits": ["string"] or [],
  "description_snippet": "string (short summary, max 200 chars)" or null
}

Job HTML/Text:
${htmlText}
`;
}
