import { useState } from 'react';
import type { JobFilterQuery } from '../types';
import { GermanLevel, EducationLevel } from '../types';

interface FilterSidebarProps {
  filters: JobFilterQuery;
  onFilterChange: (filters: JobFilterQuery) => void;
  onSearch: () => void;
}

export default function FilterSidebar({ filters, onFilterChange, onSearch }: FilterSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInputChange = (field: keyof JobFilterQuery, value: any) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const handleReset = () => {
    onFilterChange({
      page: 1,
      limit: 20,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-gray-600"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Content */}
      <div className={`space-y-6 ${!isExpanded ? 'hidden lg:block' : ''}`}>
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search
          </label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Job title, company..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>

        {/* German Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            German Level
          </label>
          <select
            value={filters.germanLevel || ''}
            onChange={(e) => handleInputChange('germanLevel', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any</option>
            {Object.values(GermanLevel).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Education Level */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Education Level
          </label>
          <select
            value={filters.educationLevel || ''}
            onChange={(e) => handleInputChange('educationLevel', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any</option>
            {Object.values(EducationLevel).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Minimum Salary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min. Salary (€/month)
          </label>
          <input
            type="number"
            value={filters.minSalary || ''}
            onChange={(e) => handleInputChange('minSalary', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 1000"
            min="0"
            step="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleInputChange('startDate', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Visa Sponsorship */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.visaNeed || false}
              onChange={(e) => handleInputChange('visaNeed', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Visa Sponsorship Required
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <button
            onClick={onSearch}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Apply Filters
          </button>
          <button
            onClick={handleReset}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
