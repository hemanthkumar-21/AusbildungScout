import type { IJob } from '../types';

interface JobCardProps {
  job: IJob;
  onClick: () => void;
}

export default function JobCard({ job, onClick }: JobCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {job.job_title}
        </h3>
        <p className="text-lg text-gray-700 font-semibold">
          {job.company_name}
        </p>
      </div>

      {/* Location */}
      <div className="mb-3">
        <div className="flex items-center text-gray-600">
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            {job.locations.map((loc) => loc.city).join(', ')}
          </span>
        </div>
      </div>

      {/* Salary */}
      {job.salary?.average && (
        <div className="mb-3">
          <span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            💰 ~{job.salary.average} {job.salary.currency}/month
          </span>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {job.german_level_requirement && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
            German: {job.german_level_requirement}
          </span>
        )}
        {job.visa_sponsorship && (
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
            Visa Support
          </span>
        )}
        {job.education_required && (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">
            {job.education_required}
          </span>
        )}
      </div>

      {/* Tech Stack */}
      {job.tech_stack && job.tech_stack.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {job.tech_stack.slice(0, 5).map((tech, idx) => (
              <span
                key={idx}
                className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs"
              >
                {tech}
              </span>
            ))}
            {job.tech_stack.length > 5 && (
              <span className="text-gray-500 text-xs px-2 py-1">
                +{job.tech_stack.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Description Snippet */}
      {job.description_snippet && (
        <p className="text-gray-600 text-sm line-clamp-2">
          {job.description_snippet}
        </p>
      )}

      {/* Start Date */}
      {job.start_date && (
        <div className="mt-3 text-sm text-gray-500">
          Start: {new Date(job.start_date).toLocaleDateString('de-DE')}
        </div>
      )}
    </div>
  );
}
