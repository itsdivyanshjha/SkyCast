import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { WeatherQuery, AIInsight, PaginatedResponse, ExportFormat } from '../types/weather';

interface WeatherQueryListProps {
  refreshTrigger: number;
}

const WeatherQueryList: React.FC<WeatherQueryListProps> = ({ refreshTrigger }) => {
  const [queries, setQueries] = useState<WeatherQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalCount: 0
  });
  const [expandedQuery, setExpandedQuery] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<{ [key: string]: AIInsight }>({});
  const [editingQuery, setEditingQuery] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<WeatherQuery>>({});
  const [editDateRange, setEditDateRange] = useState({ startDate: '', endDate: '' });
  const [editTags, setEditTags] = useState('');

  useEffect(() => {
    fetchQueries();
  }, [refreshTrigger, pagination.page]);

  const fetchQueries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/weather-queries?page=${pagination.page}&limit=${pagination.limit}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather queries');
      }

      const data: PaginatedResponse<WeatherQuery> = await response.json();
      setQueries(data.data);
      setPagination(prev => ({
        ...prev,
        totalPages: data.totalPages,
        totalCount: data.totalCount
      }));
    } catch (error) {
      console.error('Error fetching queries:', error);
      toast.error('Failed to load weather queries');
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsight = async (queryId: string) => {
    try {
      const response = await fetch(`/api/weather-queries/${queryId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.aiInsight) {
          setAiInsights(prev => ({
            ...prev,
            [queryId]: data.aiInsight
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching AI insight:', error);
    }
  };

  const handleDelete = async (queryId: string) => {
    if (!confirm('Are you sure you want to delete this weather query?')) {
      return;
    }

    try {
      const response = await fetch(`/api/weather-queries/${queryId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete weather query');
      }

      toast.success('Weather query deleted successfully');
      fetchQueries(); // Refresh the list
    } catch (error) {
      console.error('Error deleting query:', error);
      toast.error('Failed to delete weather query');
    }
  };

  const handleEdit = (query: WeatherQuery) => {
    setEditingQuery(query._id!);
    setEditForm({
      location: query.location,
      userNotes: query.userNotes
    });
    setEditDateRange({
      startDate: query.dateRange.startDate,
      endDate: query.dateRange.endDate
    });
    setEditTags(query.tags?.join(', ') || '');
  };

  const handleUpdate = async (queryId: string) => {
    try {
      const updateData = {
        ...editForm,
        dateRange: editDateRange,
        tags: editTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };

      const response = await fetch(`/api/weather-queries/${queryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update weather query');
      }

      toast.success('Weather query updated successfully');
      setEditingQuery(null);
      setEditForm({});
      setEditDateRange({ startDate: '', endDate: '' });
      setEditTags('');
      fetchQueries(); // Refresh the list
    } catch (error) {
      console.error('Error updating query:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update weather query');
    }
  };

  const handleExport = async (format: ExportFormat) => {
    try {
      const response = await fetch(`/api/export/${format}`);
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || `skycast_export.${format}`;

      // Download the file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const toggleExpanded = (queryId: string) => {
    if (expandedQuery === queryId) {
      setExpandedQuery(null);
    } else {
      setExpandedQuery(queryId);
      if (!aiInsights[queryId]) {
        fetchAIInsight(queryId);
      }
    }
  };

  if (loading && queries.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Options */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Saved Weather Queries</h2>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
              Export Data
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {(['json', 'csv', 'xml', 'pdf', 'markdown'] as ExportFormat[]).map(format => (
                <button
                  key={format}
                  onClick={() => handleExport(format)}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
                >
                  Export as {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Query List */}
      {queries.length === 0 ? (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Weather Queries Yet</h3>
          <p className="text-gray-400">Create your first weather query to get started with advanced weather tracking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {queries.map((query) => (
            <div key={query._id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              {/* Query Header */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {editingQuery === query._id ? (
                      <input
                        type="text"
                        value={editForm.location || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                        className="text-xl font-bold bg-gray-800 border border-gray-600 rounded px-3 py-1 text-white w-full"
                      />
                    ) : (
                      <h3 className="text-xl font-bold text-white">{query.location}</h3>
                    )}
                    <p className="text-gray-400 text-sm mt-1">
                      {format(new Date(query.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {editingQuery === query._id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(query._id!)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingQuery(null);
                            setEditForm({});
                            setEditDateRange({ startDate: '', endDate: '' });
                            setEditTags('');
                          }}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(query)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(query._id!)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Weather Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{query.weatherData.temperature}°C</div>
                    <div className="text-xs text-gray-400">Temperature</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white capitalize">{query.weatherData.description}</div>
                    <div className="text-xs text-gray-400">Conditions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{query.weatherData.humidity}%</div>
                    <div className="text-xs text-gray-400">Humidity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{query.weatherData.windSpeed} km/h</div>
                    <div className="text-xs text-gray-400">Wind Speed</div>
                  </div>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-4 mb-4">
                  {editingQuery === query._id ? (
                    <div className="flex gap-2 items-center">
                      <span className="text-sm text-gray-300 font-medium">Date Range:</span>
                      <input
                        type="date"
                        value={editDateRange.startDate}
                        onChange={(e) => setEditDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      />
                      <span className="text-gray-300">to</span>
                      <input
                        type="date"
                        value={editDateRange.endDate}
                        onChange={(e) => setEditDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-300">
                      <span className="font-medium">Date Range:</span> {query.dateRange.startDate} to {query.dateRange.endDate}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {editingQuery === query._id ? (
                  <div className="mb-4">
                    <label className="block text-sm text-gray-300 font-medium mb-2">Tags (comma-separated):</label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="vacation, business, personal"
                      className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                    />
                  </div>
                ) : (
                  query.tags && query.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {query.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )
                )}

                {/* Notes */}
                {query.userNotes && (
                  <div className="mb-4">
                    {editingQuery === query._id ? (
                      <textarea
                        value={editForm.userNotes || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, userNotes: e.target.value }))}
                        className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-sm"
                        rows={3}
                      />
                    ) : (
                      <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded-lg">{query.userNotes}</p>
                    )}
                  </div>
                )}

                {/* Expand Button */}
                <button
                  onClick={() => toggleExpanded(query._id!)}
                  className="w-full py-2 text-blue-400 hover:text-blue-300 transition-colors text-sm font-medium"
                >
                  {expandedQuery === query._id ? 'Hide Details' : 'Show AI Insights & Details'}
                </button>
              </div>

              {/* Expanded Content */}
              {expandedQuery === query._id && (
                <div className="border-t border-gray-700 p-6 bg-gray-800">
                  {/* AI Insights */}
                  {aiInsights[query._id!] ? (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold text-white mb-3">🤖 AI Weather Insights</h4>
                      <div className="space-y-4">
                        <div className="bg-gray-900 p-4 rounded-lg">
                          <p className="text-gray-300">{aiInsights[query._id!].insight}</p>
                        </div>
                        
                        {aiInsights[query._id!].recommendations && aiInsights[query._id!].recommendations.length > 0 && (
                          <div>
                            <h5 className="font-medium text-white mb-2">Recommendations:</h5>
                            <ul className="space-y-1">
                              {aiInsights[query._id!].recommendations.map((rec, index) => (
                                <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                                  <span className="text-blue-400 mt-1">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {aiInsights[query._id!].activitySuggestions && aiInsights[query._id!].activitySuggestions!.length > 0 && (
                          <div>
                            <h5 className="font-medium text-white mb-2">Activity Suggestions:</h5>
                            <ul className="space-y-1">
                              {aiInsights[query._id!].activitySuggestions!.map((activity, index) => (
                                <li key={index} className="text-gray-300 text-sm flex items-start gap-2">
                                  <span className="text-green-400 mt-1">•</span>
                                  {activity}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-6 text-center py-4">
                      <div className="text-gray-400">Loading AI insights...</div>
                    </div>
                  )}

                  {/* Additional AI Insights */}
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                    <p className="text-gray-400 text-sm italic">
                      Additional location intelligence features will be available soon.
                    </p>
                  </div>

                  {/* Forecast Data */}
                  {query.forecastData && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3">📅 5-Day Forecast</h4>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {query.forecastData.list.map((day, index) => (
                          <div key={index} className="bg-gray-900 p-4 rounded-lg text-center">
                            <div className="font-medium text-white mb-2">{day.date}</div>
                            <div className="text-sm text-gray-300 mb-2 capitalize">{day.description}</div>
                            <div className="text-lg font-bold text-blue-400">
                              {day.temperature.max}° / {day.temperature.min}°
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {day.pop}% rain
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-300">
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default WeatherQueryList; 