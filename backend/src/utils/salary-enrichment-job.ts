/**
 * Salary Enrichment Background Job
 * Fetches missing salaries from company websites for jobs with tariff agreements
 * Run this periodically or as a one-time job to enrich existing data
 */

import Job from '@/model/job';
import { TariffType } from '@/types';
import { resolveFirstYearSalary } from './salary-resolver';

interface EnrichmentStats {
  total: number;
  checked: number;
  updated: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Enrich jobs with missing salaries by checking company websites
 * Only processes jobs that:
 * - Don't have a firstYearSalary
 * - Have a tariff_type (not NONE)
 * - Haven't been checked recently (optional cooldown)
 */
export async function enrichMissingSalaries(
  options: {
    limit?: number;           // Max number of jobs to process (default: 50)
    cooldownDays?: number;    // Days since last check (default: 30)
    dryRun?: boolean;         // Don't actually update DB (default: false)
    delayMs?: number;         // Delay between requests (default: 2000)
  } = {}
): Promise<EnrichmentStats> {
  
  const {
    limit = 50,
    cooldownDays = 30,
    dryRun = false,
    delayMs = 2000
  } = options;
  
  const stats: EnrichmentStats = {
    total: 0,
    checked: 0,
    updated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  console.log('=== Salary Enrichment Job Started ===');
  console.log(`Options: limit=${limit}, cooldownDays=${cooldownDays}, dryRun=${dryRun}`);
  
  try {
    // Build query for jobs that need enrichment
    const query: any = {
      'salary.firstYearSalary': { $exists: false }, // No first year salary
      tariff_type: { 
        $exists: true, 
        $ne: TariffType.NONE 
      }, // Has a tariff
      is_active: true // Only active jobs
    };
    
    // Add cooldown filter if specified
    if (cooldownDays > 0) {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - cooldownDays);
      query.$or = [
        { 'benefits_last_updated': { $exists: false } },
        { 'benefits_last_updated': { $lt: cooldownDate } }
      ];
    }
    
    // Find jobs
    const jobs = await Job.find(query)
      .limit(limit)
      .lean();
    
    stats.total = jobs.length;
    console.log(`Found ${stats.total} jobs to enrich`);
    
    if (stats.total === 0) {
      console.log('No jobs found that need enrichment');
      return stats;
    }
    
    // Process each job
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (!job) continue; // Skip if undefined
      
      console.log(`\n[${i + 1}/${jobs.length}] Processing: ${job.company_name} - ${job.job_title}`);
      stats.checked++;
      
      try {
        // Resolve salary (this will check company website)
        const salaryResolution = await resolveFirstYearSalary(
          undefined, // No scraped first year
          job.salary?.thirdYearSalary,
          job.tariff_type,
          job.company_name,
          job.original_link
        );
        
        if (salaryResolution.firstYearSalary) {
          console.log(`✓ Found salary: ${salaryResolution.firstYearSalary} EUR (source: ${salaryResolution.source})`);
          
          if (!dryRun) {
            // Update the job
            await Job.updateOne(
              { _id: job._id },
              {
                $set: {
                  'salary.firstYearSalary': salaryResolution.firstYearSalary,
                  ...(salaryResolution.thirdYearSalary && { 
                    'salary.thirdYearSalary': salaryResolution.thirdYearSalary 
                  }),
                  ...(salaryResolution.average && { 
                    'salary.average': salaryResolution.average 
                  }),
                  benefits_last_updated: new Date()
                }
              }
            );
            console.log('✓ Updated in database');
          } else {
            console.log('(Dry run - not updating database)');
          }
          
          stats.updated++;
        } else {
          console.log(`✗ No salary found (source: ${salaryResolution.source})`);
          stats.skipped++;
          
          // Still update the timestamp so we don't keep checking
          if (!dryRun && cooldownDays > 0) {
            await Job.updateOne(
              { _id: job._id },
              { $set: { benefits_last_updated: new Date() } }
            );
          }
        }
        
      } catch (error) {
        console.error(`✗ Error processing job:`, error);
        stats.failed++;
        stats.errors.push(`${job.company_name}: ${error}`);
      }
      
      // Delay between requests to avoid rate limiting
      if (i < jobs.length - 1 && delayMs > 0) {
        console.log(`Waiting ${delayMs}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
  } catch (error) {
    console.error('Fatal error in enrichment job:', error);
    stats.errors.push(`Fatal: ${error}`);
  }
  
  // Print summary
  console.log('\n=== Salary Enrichment Job Complete ===');
  console.log(`Total jobs found: ${stats.total}`);
  console.log(`Jobs checked: ${stats.checked}`);
  console.log(`Jobs updated: ${stats.updated}`);
  console.log(`Jobs skipped (no salary found): ${stats.skipped}`);
  console.log(`Jobs failed: ${stats.failed}`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }
  
  return stats;
}

/**
 * CLI interface for running the enrichment job
 * Usage: 
 *   yarn salary-enrich              // Default: 50 jobs, 30 day cooldown
 *   yarn salary-enrich --limit=100  // Process 100 jobs
 *   yarn salary-enrich --dry-run    // Test without updating
 */
export async function runEnrichmentCLI() {
  const args = process.argv.slice(2);
  
  const options: any = {
    limit: 50,
    cooldownDays: 30,
    dryRun: false,
    delayMs: 2000
  };
  
  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      const val = arg.split('=')[1];
      if (val) options.limit = parseInt(val);
    } else if (arg.startsWith('--cooldown=')) {
      const val = arg.split('=')[1];
      if (val) options.cooldownDays = parseInt(val);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--delay=')) {
      const val = arg.split('=')[1];
      if (val) options.delayMs = parseInt(val);
    } else if (arg === '--help') {
      console.log(`
Salary Enrichment Job

Fetches missing first year salaries from company websites for jobs with tariff agreements.

Usage:
  yarn salary-enrich [options]

Options:
  --limit=N         Max number of jobs to process (default: 50)
  --cooldown=N      Days since last check (default: 30)
  --dry-run         Test without updating database
  --delay=N         Delay between requests in ms (default: 2000)
  --help            Show this help message

Examples:
  yarn salary-enrich                    # Process 50 jobs
  yarn salary-enrich --limit=100        # Process 100 jobs
  yarn salary-enrich --dry-run          # Test without updating
  yarn salary-enrich --cooldown=0       # Process all jobs (no cooldown)
      `);
      process.exit(0);
    }
  }
  
  const stats = await enrichMissingSalaries(options);
  
  // Exit with error code if there were failures
  if (stats.failed > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

// If run directly (not imported), execute CLI
if (require.main === module) {
  // Need to connect to database first
  const mongoose = require('mongoose');
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ausbildungscout';
  
  mongoose.connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      return runEnrichmentCLI();
    })
    .catch((error: Error) => {
      console.error('Failed to connect to MongoDB:', error);
      process.exit(1);
    });
}
