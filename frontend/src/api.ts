import axios from 'axios';
import type { JobsResponse, JobResponse, JobFilterQuery } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const jobsApi = {
  // Get all jobs with filters
  getJobs: async (filters: JobFilterQuery): Promise<JobsResponse> => {
    const params = new URLSearchParams();
    
    if (filters.germanLevel) params.append('germanLevel', filters.germanLevel);
    if (filters.visaNeed !== undefined) params.append('visaNeed', String(filters.visaNeed));
    if (filters.minSalary) params.append('minSalary', String(filters.minSalary));
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.educationLevel) params.append('educationLevel', filters.educationLevel);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    
    const response = await api.get<JobsResponse>(`/jobs?${params.toString()}`);
    return response.data;
  },

  // Get single job by ID
  getJobById: async (id: string): Promise<JobResponse> => {
    const response = await api.get<JobResponse>(`/jobs/${id}`);
    return response.data;
  },
};
