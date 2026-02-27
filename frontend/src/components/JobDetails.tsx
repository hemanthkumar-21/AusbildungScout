import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { IJob } from '../types';

interface JobDetailsProps {
  job: IJob;
  onClose: () => void;
}

export default function JobDetails({ job, onClose }: JobDetailsProps) {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Add ESC key listener to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {job.job_title}
              </h2>
              <p className="text-xl text-gray-700 font-semibold">
                {job.company_name}
              </p>
            </div>
            <Link
              to="/"
              className="ml-4 shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full p-2 transition-colors inline-flex items-center justify-center"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <Link
            to="/"
            className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Jobs
          </Link>
          {/* Location */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Location
            </h3>
            <div className="space-y-1">
              {job.locations.map((loc, idx) => (
                <div key={idx} className="text-gray-700">
                  📍 {loc.city}
                  {loc.zip_code && `, ${loc.zip_code}`}
                  {loc.state && `, ${loc.state}`}
                  {loc.address && <div className="text-sm text-gray-500 ml-5">{loc.address}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Salary */}
            {job.salary && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">💰 Salary</h4>
                <div className="space-y-1 text-gray-700">
                  {job.salary.firstYearSalary && (
                    <div>1st Year: {job.salary.firstYearSalary} {job.salary.currency}</div>
                  )}
                  {job.salary.thirdYearSalary && (
                    <div>3rd Year: {job.salary.thirdYearSalary} {job.salary.currency}</div>
                  )}
                  {job.salary.average && (
                    <div className="font-semibold">Avg: {job.salary.average} {job.salary.currency}/month</div>
                  )}
                </div>
              </div>
            )}

            {/* Start Date & Duration */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📅 Timeline</h4>
              <div className="space-y-1 text-gray-700">
                {job.start_date && (
                  <div>Start: {new Date(job.start_date).toLocaleDateString('de-DE')}</div>
                )}
                {job.duration_months && (
                  <div>Duration: {job.duration_months} months</div>
                )}
                {job.application_deadline && (
                  <div>Deadline: {new Date(job.application_deadline).toLocaleDateString('de-DE')}</div>
                )}
                {job.available_positions && (
                  <div>Positions: {job.available_positions}</div>
                )}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Requirements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.german_level_requirement && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">German Level:</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {job.german_level_requirement}
                  </span>
                </div>
              )}
              {job.english_level_requirement && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">English Level:</span>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {job.english_level_requirement}
                  </span>
                </div>
              )}
              {job.education_required && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">Education:</span>
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {job.education_required}
                  </span>
                </div>
              )}
              {job.driving_license_required && (
                <div className="flex items-center">
                  <span className="font-medium text-gray-700 mr-2">Driving License:</span>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                    Required
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Tech Stack */}
          {job.tech_stack && job.tech_stack.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Tech Stack
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.tech_stack.map((tech, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-200 text-gray-800 px-3 py-1 rounded-lg text-sm font-medium"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              Benefits & Support
            </h3>
            
            {/* Tariff Information */}
            {job.tariff_type && job.tariff_type !== 'None' && (
              <div className="mb-3 bg-purple-50 p-3 rounded-lg">
                <span className="font-medium text-gray-700">Collective Agreement:</span>{' '}
                <span className="text-purple-700 font-semibold">{job.tariff_type}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {job.visa_sponsorship && (
                <div className="flex items-center text-green-700">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Visa Sponsorship
                </div>
              )}
              {job.relocation_support?.offered && (
                <div className="flex items-center text-green-700">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Relocation Support
                </div>
              )}
            </div>
            
            {/* Detailed Relocation Support */}
            {job.relocation_support?.offered && (
              <div className="mt-3 bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Relocation Package:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {job.relocation_support.rent_subsidy && <li>Rent Subsidy Provided</li>}
                  {job.relocation_support.free_accommodation && <li>Free Accommodation</li>}
                  {job.relocation_support.moving_cost_covered && <li>Moving Costs Covered</li>}
                  {job.relocation_support.temporary_housing && <li>Temporary Housing Available</li>}
                  {job.relocation_support.relocation_bonus && (
                    <li>Relocation Bonus: {job.relocation_support.relocation_bonus} EUR</li>
                  )}
                  {job.relocation_support.details && <li>{job.relocation_support.details}</li>}
                </ul>
              </div>
            )}
            
            {job.benefits && job.benefits.length > 0 && (
              <div className="mt-3">
                <h4 className="font-medium text-gray-900 mb-2">Additional Benefits:</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {job.benefits.map((benefit, idx) => (
                    <li key={idx}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Benefit Tags */}
            {job.benefits_tags && job.benefits_tags.length > 0 && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-2">
                  {job.benefits_tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium"
                    >
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {job.description_full && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Full Description
              </h3>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {job.description_full}
              </div>
            </div>
          )}

          {/* Contact Person */}
          {job.contact_person && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900">
                Contact Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-1 text-gray-700">
                {job.contact_person.name && (
                  <div>
                    <span className="font-medium">Name:</span> {job.contact_person.name}
                  </div>
                )}
                {job.contact_person.role && (
                  <div>
                    <span className="font-medium">Role:</span> {job.contact_person.role}
                  </div>
                )}
                {job.contact_person.email && (
                  <div>
                    <span className="font-medium">Email:</span>{' '}
                    <a href={`mailto:${job.contact_person.email}`} className="text-blue-600 hover:underline">
                      {job.contact_person.email}
                    </a>
                  </div>
                )}
                {job.contact_person.phone && (
                  <div>
                    <span className="font-medium">Phone:</span> {job.contact_person.phone}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apply Button */}
          {job.original_link && (
            <div className="mt-6">
              <a
                href={job.original_link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-colors"
              >
                Apply Now →
              </a>
            </div>
          )}

          {/* Meta Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-500">
            {job.posted_at && (
              <div>Posted: {new Date(job.posted_at).toLocaleDateString('de-DE')}</div>
            )}
            {job.source_platform && (
              <div>Source: {job.source_platform}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
