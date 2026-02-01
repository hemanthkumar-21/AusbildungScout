/**
 * Gemini AI Pipeline (Phase B)
 * Converts raw German HTML text into structured JSON data
 */

import { IJob, GermanLevel, EducationLevel } from '@/types';
import {
  normalizeBenefits,
  normalizeTechStack,
  calculateSalaryAverage,
  normalizeDate,
} from './normalizer';

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
  visa_sponsorship?: boolean;
  relocation_support?: boolean;
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
    
    // Build salary object with proper type handling
    const salaryObj: any = {
      currency: 'EUR',
    };
    
    if (aiResponse.salary?.firstYearSalary !== undefined) {
      salaryObj.firstYearSalary = aiResponse.salary.firstYearSalary;
    }
    if (aiResponse.salary?.thirdYearSalary !== undefined) {
      salaryObj.thirdYearSalary = aiResponse.salary.thirdYearSalary;
    }
    if (salaryAverage !== undefined) {
      salaryObj.average = salaryAverage;
    }
    
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
      visa_sponsorship: visaSponsorship,
      ...(aiResponse.relocation_support && { relocation_support: aiResponse.relocation_support }),
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

3. Visa sponsorship: Set to true ONLY if these keywords appear:
   "Relocation support", "Visa assistance", "International applicants welcome", "Blue Card"
   Otherwise, false.

4. Education level: Map to Hauptschulabschluss, Realschulabschluss, Abitur, Fachabitur, or null.

5. Tech stack: Lowercase, remove duplicates, return empty array if none mentioned.

6. Benefits: Extract and list (e.g., "30 Tage Urlaub", "Kostenlos Kaffee"), empty array if none.

7. Dates: Standardize to ISO format (YYYY-MM-DD).

8. All optional fields (like english_level_requirement, german_level_requirement): use null if not mentioned, NOT empty strings.

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
  "visa_sponsorship": boolean,
  "relocation_support": boolean or null,
  "benefits": ["string"] or [],
  "description_snippet": "string (short summary, max 200 chars)" or null
}

Job HTML/Text:
${htmlText}
`;
}
