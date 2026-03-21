/**
 * Job Routes
 * REST API endpoints for job operations
 */

import { Router } from 'express';
import {
  getJobs,
  getJobById,
  searchJobs,
  getStats,
} from './jobs.controller';

const router = Router();

// GET endpoints
router.get('/stats', getStats);
router.get('/search', searchJobs);
router.get('/:id', getJobById);
router.get('/', getJobs);

export default router;
