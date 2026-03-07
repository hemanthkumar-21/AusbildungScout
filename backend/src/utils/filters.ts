/**
 * API Filtering Logic
 * Implements the three-phase filtering pipeline with enhanced salary and start date filters
 */

import { GermanLevelRank, GermanLevel, TariffType, StartDateType } from '@/types';

export interface JobFilterQuery {
  // Hard Constraints
  germanLevel?: GermanLevel;
  visaNeed?: boolean;
  
  // Range Constraints
  minSalary?: number;
  maxSalary?: number;                 // NEW: Upper salary limit
  salaryAboveAverage?: boolean;        // NEW: Filter salaries above market average
  
  startDate?: string;
  startDateType?: StartDateType[];     // NEW: Filter by fixed/flexible/negotiable
  
  educationLevel?: string;
  minVacancies?: number;
  
  // Duration Filters - NEW
  maxDurationMonths?: number;          // Filter for shorter apprenticeships
  minDurationMonths?: number;          // Filter for longer apprenticeships
  
  // New Filters
  tariffTypes?: TariffType[];          // Filter by multiple tariff types
  relocationSupport?: boolean;         // Filter for relocation support offered
  rentSubsidy?: boolean;               // Filter for rent subsidy
  freeAccommodation?: boolean;         // Filter for free accommodation
  benefitTags?: string[];              // Filter by specific benefit tags
  
  // Minijob Filters - NEW
  minijobAccepted?: boolean;           // Filter for minijob acceptance
  minMinijobAcceptanceRate?: number;   // NEW: Minimum acceptance rate (0-100%)
  
  hideInactive?: boolean;              // Hide inactive/stale jobs
  sortBy?: 'salary-high' | 'salary-low' | 'duration-short' | 'default';  // NEW: duration sorting
  
  // Fuzzy Search
  searchTerm?: string;
  
  // Pagination
  page?: number;
  limit?: number;
}

/**
 * Get market average salary for salary comparison
 * Based on current tariff data
 */
function getMarketAverageSalary(): number {
  // Average of all major tariffs (rough estimate)
  return 1050; // EUR/month for 1st year
}

/**
 * Convert filter query to MongoDB filter object
 * Uses three-phase pipeline as specified
 */
export function buildMongoDBFilter(query: JobFilterQuery) {
  const filter: any = {};
  
  // === OPTIONAL: Hide inactive jobs if requested ===
  if (query.hideInactive === true) {
    filter.is_active = true;
  }
  
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
  
  // Salary Filters: Multiple options
  const hasSalaryFilter = query.minSalary || query.maxSalary || query.salaryAboveAverage;
  
  if (hasSalaryFilter) {
    filter['salary.firstYearSalary'] = { $exists: true, $ne: null, $gt: 0 };
    
    // Minimum salary
    if (query.minSalary && query.minSalary > 0) {
      filter['salary.firstYearSalary'].$gte = query.minSalary;
    }
    
    // Maximum salary
    if (query.maxSalary && query.maxSalary > 0) {
      filter['salary.firstYearSalary'].$lte = query.maxSalary;
    }
    
    // Salary above market average
    if (query.salaryAboveAverage === true) {
      const avgSalary = getMarketAverageSalary();
      filter['salary.firstYearSalary'].$gte = avgSalary;
    }
  } else if (query.sortBy === 'salary-high' || query.sortBy === 'salary-low') {
    // When sorting by salary, only show jobs that have a salary
    filter['salary.firstYearSalary'] = { $exists: true, $ne: null, $gt: 0 };
  }
  
  // Start Date Filters
  if (query.startDate) {
    const desiredStart = new Date(query.startDate);
    filter.start_date = { $gte: desiredStart };
  }
  
  // Start Date Type Filter (flexible/fixed/negotiable)
  if (query.startDateType && query.startDateType.length > 0) {
    filter.start_date_type = { $in: query.startDateType };
  }
  
  // Education: Exact match or lower requirement
  if (query.educationLevel) {
    filter.education_required = query.educationLevel;
  }
  
  // Vacancy Count: Minimum number of open positions
  if (query.minVacancies && query.minVacancies > 0) {
    filter.vacancy_count = { $gte: query.minVacancies };
  }
  
  // Duration Filters (NEW)
  if (query.minDurationMonths && query.minDurationMonths > 0) {
    filter.duration_months = { $gte: query.minDurationMonths };
  }
  
  if (query.maxDurationMonths && query.maxDurationMonths > 0) {
    if (filter.duration_months) {
      filter.duration_months.$lte = query.maxDurationMonths;
    } else {
      filter.duration_months = { $lte: query.maxDurationMonths };
    }
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
  
  // Minijob Filters (NEW)
  if (query.minijobAccepted === true) {
    filter.minijob_acceptance = true;
  }
  
  if (query.minMinijobAcceptanceRate && query.minMinijobAcceptanceRate > 0) {
    filter.minijob_acceptance_rate = { $gte: query.minMinijobAcceptanceRate };
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
export function buildSortOptions(searchTerm?: string, sortBy?: string): any {
  // If text search is used, sort by relevance score
  if (searchTerm) {
    return { score: { $meta: 'textScore' } };
  }
  
  // Handle sorting options
  if (sortBy === 'salary-high') {
    // High to low: Sort by first year salary descending
    return { 'salary.firstYearSalary': -1, posted_at: -1 };
  }
  
  if (sortBy === 'salary-low') {
    // Low to high: Sort by first year salary ascending
    return { 'salary.firstYearSalary': 1, posted_at: -1 };
  }
  
  if (sortBy === 'duration-short') {
    // Shorter apprenticeships first (useful for career changers)
    return { duration_months: 1, posted_at: -1 };
  }
  
  // Default: Sort by most recently posted first
  return { posted_at: -1 };
}
