/**
 * Job API Controllers
 * Handles all job-related API requests
 */

import { Request, Response } from 'express';
import Job from '@/model/job';
import { buildMongoDBFilter, getPaginationParams, buildSortOptions, JobFilterQuery } from '@/utils/filters';

/**
 * GET /api/jobs
 * Fetch jobs with filtering, searching, and pagination
 */
export async function getJobs(req: Request, res: Response) {
  try {
    // Extract query parameters
    const query: JobFilterQuery = {
      germanLevel: req.query.germanLevel as any,
      visaNeed: req.query.visaNeed === 'true',
      minSalary: req.query.minSalary ? parseInt(req.query.minSalary as string) : undefined,
      startDate: req.query.startDate as string,
      educationLevel: req.query.educationLevel as string,
      searchTerm: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
    };
    
    // Build MongoDB filter
    const filter = buildMongoDBFilter(query);
    
    // Get pagination params
    const { skip, limit } = getPaginationParams(query.page, query.limit);
    
    // Build sort options
    const sort = buildSortOptions(query.searchTerm);
    
    // Execute query
    const jobs = await Job.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Count total results (without pagination)
    const total = await Job.countDocuments(filter);
    
    // Return response
    res.json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page: Math.ceil(skip / limit) + 1,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch jobs',
    });
  }
}

/**
 * GET /api/jobs/:id
 * Fetch a single job by ID
 */
export async function getJobById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const job = await Job.findById(id).lean();
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }
    
    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job',
    });
  }
}

/**
 * GET /api/jobs/search
 * Full-text search endpoint
 */
export async function searchJobs(req: Request, res: Response) {
  try {
    const searchTerm = req.query.q as string;
    
    if (!searchTerm || searchTerm.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search term required',
      });
    }
    
    // Build MongoDB text search
    const jobs = await Job.find(
      { $text: { $search: searchTerm } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();
    
    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
}

/**
 * GET /api/stats
 * Return job market statistics
 */
export async function getStats(req: Request, res: Response) {
  try {
    const totalJobs = await Job.countDocuments();
    
    const salaryStats = await Job.aggregate([
      {
        $match: { 'salary.average': { $ne: null } },
      },
      {
        $group: {
          _id: null,
          avgSalary: { $avg: '$salary.average' },
          minSalary: { $min: '$salary.average' },
          maxSalary: { $max: '$salary.average' },
        },
      },
    ]);
    
    const languageStats = await Job.aggregate([
      {
        $group: {
          _id: '$german_level_requirement',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const visaJobs = await Job.countDocuments({ visa_sponsorship: true });
    
    res.json({
      success: true,
      data: {
        totalJobs,
        salaryStats: salaryStats[0] || { avgSalary: 0, minSalary: 0, maxSalary: 0 },
        languageStats,
        visaSponsorshipJobs: visaJobs,
        visaSponsorshipPercentage: ((visaJobs / totalJobs) * 100).toFixed(2) + '%',
      },
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
    });
  }
}

/**
 * POST /api/jobs (Admin only)
 * Manually add a job (for testing or admin purposes)
 */
export async function createJob(req: Request, res: Response) {
  try {
    const jobData = req.body;
    
    // Validate required fields
    if (!jobData.job_title || !jobData.company_name || !jobData.original_link) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: job_title, company_name, original_link',
      });
    }
    
    // Check for duplicate
    const existing = await Job.findOne({ original_link: jobData.original_link });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Job with this link already exists',
      });
    }
    
    const job = new Job(jobData);
    await job.save();
    
    res.status(201).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create job',
    });
  }
}
