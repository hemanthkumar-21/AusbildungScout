import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { jobsApi } from "../api";
import type { IJob, JobFilterQuery } from "../types";
import JobCard from "../components/JobCard";
import FilterSidebar from "../components/FilterSidebar";
import Pagination from "../components/Pagination";

export default function JobListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<IJob[]>([]);
  const [filters, setFilters] = useState<JobFilterQuery>(() => {
    return {
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "20", 10),
      germanLevel: searchParams.get("germanLevel") || undefined,
      visaNeed: searchParams.get("visaNeed") === "true",
      minSalary: searchParams.get("minSalary")
        ? parseInt(searchParams.get("minSalary")!, 10)
        : undefined,
      maxSalary: searchParams.get("maxSalary")
        ? parseInt(searchParams.get("maxSalary")!, 10)
        : undefined,
      salaryAboveAverage: searchParams.get("salaryAboveAverage") === "true",
      startDate: searchParams.get("startDate") || undefined,
      startDateType: searchParams.get("startDateType") || undefined,
      educationLevel: searchParams.get("educationLevel") || undefined,
      minDurationMonths: searchParams.get("minDurationMonths")
        ? parseInt(searchParams.get("minDurationMonths")!, 10)
        : undefined,
      maxDurationMonths: searchParams.get("maxDurationMonths")
        ? parseInt(searchParams.get("maxDurationMonths")!, 10)
        : undefined,
      search: searchParams.get("search") || undefined,
      tariffTypes: searchParams.get("tariffTypes") || undefined,
      relocationSupport: searchParams.get("relocationSupport") === "true",
      rentSubsidy: searchParams.get("rentSubsidy") === "true",
      freeAccommodation: searchParams.get("freeAccommodation") === "true",
      benefitTags: searchParams.get("benefitTags") || undefined,
      minVacancies: searchParams.get("minVacancies")
        ? parseInt(searchParams.get("minVacancies")!, 10)
        : undefined,
      minijobAccepted: searchParams.get("minijobAccepted") === "true",
      minMinijobAcceptanceRate: searchParams.get("minMinijobAcceptanceRate")
        ? parseInt(searchParams.get("minMinijobAcceptanceRate")!, 10)
        : undefined,
      hideInactive: searchParams.get("hideInactive") === "true",
      sortBy: searchParams.get("sortBy")
        ? searchParams.get("sortBy")
        : undefined,
      hiringProcessTypes: searchParams.get("hiringProcessTypes") || undefined,
      directContactMethods:
        searchParams.get("directContactMethods") || undefined,
      offCycleIntakePossible:
        searchParams.get("offCycleIntakePossible") === "true",
      verkshuerzungSupported:
        searchParams.get("verkshuerzungSupported") === "true",
      tariffNegotiable: searchParams.get("tariffNegotiable") === "true",
      minSalaryNegotiable: searchParams.get("minSalaryNegotiable") === "true",
      decisionSpeedMinimum: searchParams.get("decisionSpeedMinimum")
        ? searchParams.get("decisionSpeedMinimum")
        : undefined,
      companyFlexibilityMinimum: searchParams.get("companyFlexibilityMinimum")
        ? searchParams.get("companyFlexibilityMinimum")
        : undefined,
    } as JobFilterQuery;
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [loading, setLoading] = useState(false);

  const syncFiltersToURL = (updatedFilters: JobFilterQuery) => {
    const params = new URLSearchParams();

    // Add non-empty filter values to URL
    if (updatedFilters.page && updatedFilters.page > 1)
      params.set("page", updatedFilters.page.toString());
    if (updatedFilters.limit && updatedFilters.limit !== 20)
      params.set("limit", updatedFilters.limit.toString());
    if (updatedFilters.germanLevel)
      params.set("germanLevel", updatedFilters.germanLevel);
    if (updatedFilters.visaNeed) params.set("visaNeed", "true");
    if (updatedFilters.minSalary)
      params.set("minSalary", updatedFilters.minSalary.toString());
    if (updatedFilters.maxSalary)
      params.set("maxSalary", updatedFilters.maxSalary.toString());
    if (updatedFilters.salaryAboveAverage)
      params.set("salaryAboveAverage", "true");
    if (updatedFilters.startDate)
      params.set("startDate", updatedFilters.startDate);
    if (updatedFilters.startDateType)
      params.set("startDateType", updatedFilters.startDateType);
    if (updatedFilters.educationLevel)
      params.set("educationLevel", updatedFilters.educationLevel);
    if (updatedFilters.minDurationMonths)
      params.set(
        "minDurationMonths",
        updatedFilters.minDurationMonths.toString(),
      );
    if (updatedFilters.maxDurationMonths)
      params.set(
        "maxDurationMonths",
        updatedFilters.maxDurationMonths.toString(),
      );
    if (updatedFilters.search) params.set("search", updatedFilters.search);
    if (updatedFilters.tariffTypes)
      params.set("tariffTypes", updatedFilters.tariffTypes);
    if (updatedFilters.relocationSupport)
      params.set("relocationSupport", "true");
    if (updatedFilters.rentSubsidy) params.set("rentSubsidy", "true");
    if (updatedFilters.freeAccommodation)
      params.set("freeAccommodation", "true");
    if (updatedFilters.benefitTags)
      params.set("benefitTags", updatedFilters.benefitTags);
    if (updatedFilters.minVacancies)
      params.set("minVacancies", updatedFilters.minVacancies.toString());
    if (updatedFilters.minijobAccepted) params.set("minijobAccepted", "true");
    if (updatedFilters.minMinijobAcceptanceRate)
      params.set(
        "minMinijobAcceptanceRate",
        updatedFilters.minMinijobAcceptanceRate.toString(),
      );
    if (updatedFilters.hideInactive) params.set("hideInactive", "true");
    if (updatedFilters.sortBy) params.set("sortBy", updatedFilters.sortBy);
    // NEW: Hiring Process Filters
    if (updatedFilters.hiringProcessTypes)
      params.set("hiringProcessTypes", updatedFilters.hiringProcessTypes);
    if (updatedFilters.directContactMethods)
      params.set("directContactMethods", updatedFilters.directContactMethods);
    if (updatedFilters.offCycleIntakePossible)
      params.set("offCycleIntakePossible", "true");
    if (updatedFilters.verkshuerzungSupported)
      params.set("verkshuerzungSupported", "true");
    if (updatedFilters.tariffNegotiable) params.set("tariffNegotiable", "true");
    if (updatedFilters.minSalaryNegotiable)
      params.set("minSalaryNegotiable", "true");
    if (updatedFilters.decisionSpeedMinimum)
      params.set("decisionSpeedMinimum", updatedFilters.decisionSpeedMinimum);
    if (updatedFilters.companyFlexibilityMinimum)
      params.set(
        "companyFlexibilityMinimum",
        updatedFilters.companyFlexibilityMinimum,
      );

    // Update URL without page reload
    setSearchParams(params, { replace: true });
  };

  const fetchJobs = useCallback(async (filtersToUse: JobFilterQuery) => {
    setLoading(true);
    try {
      const response = await jobsApi.getJobs(filtersToUse);
      setJobs(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast.error("Failed to fetch jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle filter changes and sync to URL
   */
  const handleFilterChange = (newFilters: JobFilterQuery) => {
    setFilters(newFilters);
    syncFiltersToURL(newFilters);
    // Fetch jobs with the new filters immediately
    fetchJobs(newFilters);
  };

  // Fetch jobs on initial load and when URL parameters change
  useEffect(() => {
    fetchJobs(filters);
  }, [filters, fetchJobs]);

  const handleSearch = () => {
    // Reset to page 1 when searching with new filters
    const updatedFilters = { ...filters, page: 1 };
    setFilters(updatedFilters);
    syncFiltersToURL(updatedFilters);
    // fetchJobs will be called by useEffect when filters change
  };

  const handlePageChange = (page: number) => {
    // Only update page, don't call fetchJobs directly
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    syncFiltersToURL(updatedFilters);
    // fetchJobs will be called by useEffect when filters.page changes
    window.scrollTo({ top: 0, behavior: "smooth" });
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
              onFilterChange={handleFilterChange}
              onSearch={handleSearch}
            />
          </aside>

          {/* Job List */}
          <div className="lg:col-span-3">
            {/* Results Summary */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? "Loading..." : `${pagination.total} Jobs Found`}
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
