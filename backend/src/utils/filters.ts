/**
 * API Filtering Logic
 * Implements the three-phase filtering pipeline
 */

import { GermanLevelRank, GermanLevel, TariffType } from '@/types';

export interface JobFilterQuery {
  // Hard Constraints
  germanLevel?: GermanLevel;
  visaNeed?: boolean;
  
  // Range Constraints
  minSalary?: number;
  startDate?: string;
  educationLevel?: string;
  
  // New Filters
  tariffTypes?: TariffType[];      // Filter by multiple tariff types
  relocationSupport?: boolean;      // Filter for relocation support offered
  rentSubsidy?: boolean;            // Filter for rent subsidy
  freeAccommodation?: boolean;      // Filter for free accommodation
  benefitTags?: string[];           // Filter by specific benefit tags
  
  // Fuzzy Search
  searchTerm?: string;
  
  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Convert filter query to MongoDB filter object
 * Uses three-phase pipeline as specified
 */
export function buildMongoDBFilter(query: JobFilterQuery) {
  const filter: any = {};
  
  // === PHASE 1: HARD CONSTRAINTS ===
  
  // German Level: User level must be >= job requirement
  if (query.germanLevel) {
    const userRank = GermanLevelRank[query.germanLevel];
    const allowedLevels = Object.entries(GermanLevelRank)
      .filter(([_, rank]) => rank <= userRank)
      .map(([level]) => level);
    
    filter.german_level_requirement = { $in: allowedLevels };
  }
  
  // Visa Sponsorship: Strict match if needed
  if (query.visaNeed === true) {
    filter.visa_sponsorship = true;
  }
  
  // === PHASE 2: RANGE CONSTRAINTS ===
  
  // Salary: Check firstYearSalary OR average (whichever is available)
  if (query.minSalary && query.minSalary > 0) {
    filter.$or = [
      { 'salary.firstYearSalary': { $gte: query.minSalary } },
      { 'salary.average': { $gte: query.minSalary } }
    ];
  }
  
  // Start Date: Must be >= user's desired start date
  if (query.startDate) {
    const desiredStart = new Date(query.startDate);
    filter.start_date = { $gte: desiredStart };
  }
  
  // Education: Exact match or lower requirement
  if (query.educationLevel) {
    filter.education_required = query.educationLevel;
  }
  
  // Tariff Type: Filter by specific tariff agreements
  if (query.tariffTypes && query.tariffTypes.length > 0) {
    filter.tariff_type = { $in: query.tariffTypes };
  }
  
  // Relocation Support Filters
  if (query.relocationSupport === true) {
    filter['relocation_support.offered'] = true;
  }
  
  if (query.rentSubsidy === true) {
    filter['relocation_support.rent_subsidy'] = true;
  }
  
  if (query.freeAccommodation === true) {
    filter['relocation_support.free_accommodation'] = true;
  }
  
  // Benefit Tags: Jobs must have ALL specified benefit tags
  if (query.benefitTags && query.benefitTags.length > 0) {
    filter.benefits_tags = { $all: query.benefitTags };
  }
  
  // === PHASE 3: FUZZY SEARCH ===
  // Text search is handled separately via $text operator
  if (query.searchTerm) {
    filter.$text = { $search: query.searchTerm };
  }
  
  return filter;
}

/**
 * Get pagination parameters
 * Always return limit=20, skip=page*20
 */
export function getPaginationParams(
  page: number = 1,
  limit: number = 20
): { skip: number; limit: number } {
  const validPage = Math.max(1, Math.floor(page));
  const validLimit = Math.min(20, Math.max(1, Math.floor(limit))); // Max 20 per page
  
  return {
    skip: (validPage - 1) * validLimit,
    limit: validLimit,
  };
}

/**
 * Build sort options for MongoDB query
 */
export function buildSortOptions(searchTerm?: string): Record<string, 1 | -1> {
  // If text search is used, sort by relevance score
  if (searchTerm) {
    return { score: { $meta: 'textScore' } };
  }
  
  // Default: Sort by most recently posted first
  return { posted_at: -1 };
}
