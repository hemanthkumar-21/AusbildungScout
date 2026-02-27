import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { jobsApi } from '../api';
import type { IJob, JobFilterQuery } from '../types';
import JobCard from '../components/JobCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';

export default function JobListPage() {
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [filters, setFilters] = useState<JobFilterQuery>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await jobsApi.getJobs(filters);
      setJobs(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filters.page]);

  const handleSearch = () => {
    setFilters({ ...filters, page: 1 });
    fetchJobs();
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
              🎓 AusbildungScout
            </h1>
          </Link>
          <p className="mt-2 text-gray-600">
            Find your perfect apprenticeship in Germany
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <FilterSidebar
              filters={filters}
              onFilterChange={setFilters}
              onSearch={handleSearch}
            />
          </aside>

          {/* Job List */}
          <div className="lg:col-span-3">
            {/* Results Summary */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? 'Loading...' : `${pagination.total} Jobs Found`}
              </h2>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* No Results */}
            {!loading && jobs.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No jobs found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your filters or search criteria.
                </p>
              </div>
            )}

            {/* Job Cards */}
            {!loading && jobs.length > 0 && (
              <>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
