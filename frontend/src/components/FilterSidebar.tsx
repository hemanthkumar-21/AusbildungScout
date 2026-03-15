import { useState } from 'react';
import type { JobFilterQuery } from '../types';
import { GermanLevel, EducationLevel, TariffType, StartDateType } from '../types';

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
    <div className="bg-white rounded-lg shadow-md sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="lg:hidden text-gray-600"
        >
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Content - Scrollable with hidden scrollbar */}
      <div className={`overflow-y-auto flex-1 px-6 py-4 scrollbar-hide ${!isExpanded ? 'hidden lg:block' : ''}`}>
        <div className="space-y-6">{/* Search */}
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

        {/* Sort Order */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sort By
          </label>
          <select
            value={filters.sortBy || 'default'}
            onChange={(e) => handleInputChange('sortBy', e.target.value === 'default' ? undefined : e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="default">Recently Posted</option>
            <option value="salary-high">Salary: High to Low</option>
            <option value="salary-low">Salary: Low to High</option>
            <option value="duration-short">Duration: Shortest First</option>
            <option value="flexibility">⚡ Most Flexible Companies</option>
          </select>
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

        {/* Maximum Salary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max. Salary (€/month)
          </label>
          <input
            type="number"
            value={filters.maxSalary || ''}
            onChange={(e) => handleInputChange('maxSalary', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 1500"
            min="0"
            step="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Salary Above Average */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.salaryAboveAverage || false}
              onChange={(e) => handleInputChange('salaryAboveAverage', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Above Market Average
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-6 mt-1">
            Show only higher paying positions
          </p>
        </div>

        {/* Minimum Vacancies */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Min. Open Positions
          </label>
          <input
            type="number"
            value={filters.minVacancies || ''}
            onChange={(e) => handleInputChange('minVacancies', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="e.g., 1"
            min="1"
            step="1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Hide Inactive Jobs */}
        <div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.hideInactive || false}
              onChange={(e) => handleInputChange('hideInactive', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">
              Hide Inactive/Stale Jobs
            </span>
          </label>
          <p className="text-xs text-gray-500 ml-6 mt-1">
            Hide jobs that are no longer available
          </p>
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

        {/* Start Date Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date Flexibility
          </label>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.startDateType?.includes('fixed') || false}
                onChange={(e) => {
                  const types = filters.startDateType?.split(',') || [];
                  const filtered = types.filter(t => t !== 'fixed');
                  if (e.target.checked) {
                    filtered.push('fixed');
                  }
                  handleInputChange('startDateType', filtered.length > 0 ? filtered.join(',') : undefined);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Fixed Dates</span>
            </label>
            
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.startDateType?.includes('flexible') || false}
                onChange={(e) => {
                  const types = filters.startDateType?.split(',') || [];
                  const filtered = types.filter(t => t !== 'flexible');
                  if (e.target.checked) {
                    filtered.push('flexible');
                  }
                  handleInputChange('startDateType', filtered.length > 0 ? filtered.join(',') : undefined);
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Flexible/Negotiable</span>
            </label>
          </div>
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

        {/* Apprenticeship Duration */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Apprenticeship Duration</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min. Duration (months)
              </label>
              <input
                type="number"
                value={filters.minDurationMonths || ''}
                onChange={(e) => handleInputChange('minDurationMonths', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 24"
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max. Duration (months)
              </label>
              <input
                type="number"
                value={filters.maxDurationMonths || ''}
                onChange={(e) => handleInputChange('maxDurationMonths', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 36"
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Minijob Options */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Employment Options</h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.minijobAccepted || false}
                onChange={(e) => handleInputChange('minijobAccepted', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Accepts Minijob (450€)</span>
            </label>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min. Minijob Acceptance Rate (%)
              </label>
              <input
                type="number"
                value={filters.minMinijobAcceptanceRate || ''}
                onChange={(e) => handleInputChange('minMinijobAcceptanceRate', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 80"
                min="0"
                max="100"
                step="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Position must have at least this % accepting minijob</p>
            </div>
          </div>
        </div>

        {/* Tariff Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tariff Agreement
          </label>
          <select
            value={filters.tariffTypes || ''}
            onChange={(e) => handleInputChange('tariffTypes', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Any</option>
            {Object.values(TariffType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Relocation Support Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Relocation Support</h3>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.relocationSupport || false}
                onChange={(e) => handleInputChange('relocationSupport', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Any Relocation Support</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.rentSubsidy || false}
                onChange={(e) => handleInputChange('rentSubsidy', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Rent Subsidy</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.freeAccommodation || false}
                onChange={(e) => handleInputChange('freeAccommodation', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Free Accommodation</span>
            </label>
          </div>
        </div>

        {/* Popular Benefits Section */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Must-Have Benefits</h3>
          <p className="text-xs text-gray-500 mb-2">Select benefits that must be offered</p>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[
              { value: 'HOME_OFFICE', label: 'Home Office' },
              { value: 'LAPTOP', label: 'Laptop Provided' },
              { value: 'FLEXIBLE_HOURS', label: 'Flexible Hours' },
              { value: 'VACATION_30', label: '30 Days Vacation' },
              { value: 'SALARY_13TH', label: '13th Month Salary' },
              { value: 'PENSION_PLAN', label: 'Pension Plan' },
              { value: 'TRAINING', label: 'Training/Education' },
              { value: 'GYM', label: 'Gym/Fitness' },
              { value: 'CANTEEN', label: 'Canteen' },
              { value: 'PUBLIC_TRANSPORT', label: 'Public Transport Ticket' },
              { value: 'BIKE_LEASE', label: 'Bike Leasing' },
              { value: 'COMPANY_CAR', label: 'Company Car' },
            ].map(({ value, label }) => {
              const currentTags = filters.benefitTags ? filters.benefitTags.split(',') : [];
              const isChecked = currentTags.includes(value);
              
              return (
                <label key={value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      const tags = currentTags.filter(t => t !== value);
                      if (e.target.checked) {
                        tags.push(value);
                      }
                      handleInputChange('benefitTags', tags.length > 0 ? tags.join(',') : undefined);
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* NEW: Hiring Process & Negotiation Section (CRITICAL FOR YOUR STRATEGY) */}
        <div className="border-t pt-4 bg-amber-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">⚡ Hiring Process & Flexibility</h3>
          <p className="text-xs text-gray-600 mb-3">Find companies willing to negotiate off-cycle (March 2027) hires</p>
          
          <div className="space-y-3">
            {/* Off-Cycle Intake (CRITICAL) */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.offCycleIntakePossible || false}
                onChange={(e) => handleInputChange('offCycleIntakePossible', e.target.checked)}
                className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
              />
              <span className="text-sm font-medium text-amber-900">
                ⭐ Can Hire Off-Cycle (March 2027)
              </span>
            </label>
            <p className="text-xs text-amber-700 ml-6">Companies flexible on hiring dates, not just August</p>

            {/* Verkürzung Support */}
            <label className="flex items-center space-x-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={filters.verkshuerzungSupported || false}
                onChange={(e) => handleInputChange('verkshuerzungSupported', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Supports Verkürzung (IHK Shortening)
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Will petition IHK to reduce 3-year to 2.5/2 years</p>

            {/* Tariff Negotiable */}
            <label className="flex items-center space-x-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={filters.tariffNegotiable || false}
                onChange={(e) => handleInputChange('tariffNegotiable', e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Tariff Negotiable (Above Minimum)
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Not strictly bound by union salary minimums</p>

            {/* Salary Negotiable */}
            <label className="flex items-center space-x-2 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={filters.minSalaryNegotiable || false}
                onChange={(e) => handleInputChange('minSalaryNegotiable', e.target.checked)}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">
                Base Salary Negotiable
              </span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Willing to negotiate higher starting salary</p>

            {/* Company Flexibility Filter */}
            <div className="mt-3 pt-3 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Company Flexibility Level
              </label>
              <select
                value={filters.companyFlexibilityMinimum || ''}
                onChange={(e) => handleInputChange('companyFlexibilityMinimum', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Any</option>
                <option value="high">High (Very Flexible, Negotiation-Friendly)</option>
                <option value="medium">Medium (Typical Companies)</option>
                <option value="low">Low (Rigid Rules)</option>
              </select>
            </div>

            {/* Direct Contact Methods */}
            <div className="mt-3 pt-3 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Direct Contact Available Via:
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.directContactMethods?.includes('whatsapp') || false}
                    onChange={(e) => {
                      const methods = filters.directContactMethods?.split(',') || [];
                      const filtered = methods.filter(m => m !== 'whatsapp');
                      if (e.target.checked) {
                        filtered.push('whatsapp');
                      }
                      handleInputChange('directContactMethods', filtered.length > 0 ? filtered.join(',') : undefined);
                    }}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">WhatsApp 📱</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.directContactMethods?.includes('phone') || false}
                    onChange={(e) => {
                      const methods = filters.directContactMethods?.split(',') || [];
                      const filtered = methods.filter(m => m !== 'phone');
                      if (e.target.checked) {
                        filtered.push('phone');
                      }
                      handleInputChange('directContactMethods', filtered.length > 0 ? filtered.join(',') : undefined);
                    }}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">Direct Phone ☎️</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.directContactMethods?.includes('email-senior') || false}
                    onChange={(e) => {
                      const methods = filters.directContactMethods?.split(',') || [];
                      const filtered = methods.filter(m => m !== 'email-senior');
                      if (e.target.checked) {
                        filtered.push('email-senior');
                      }
                      handleInputChange('directContactMethods', filtered.length > 0 ? filtered.join(',') : undefined);
                    }}
                    className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700">Email (Decision Maker) 💼</span>
                </label>
              </div>
            </div>

            {/* Decision Speed */}
            <div className="mt-3 pt-3 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Min. Decision Speed
              </label>
              <select
                value={filters.decisionSpeedMinimum || ''}
                onChange={(e) => handleInputChange('decisionSpeedMinimum', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Any</option>
                <option value="fast">Fast (Quick Offers)</option>
                <option value="medium">Medium (Normal Process)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 pb-2">
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
    </div>
  );
}
