import { useState, useEffect } from 'react';
import Head from 'next/head';
import WeatherCard from '../components/WeatherCard';
import ForecastCard from '../components/ForecastCard';
import WeatherQueryForm from '../components/WeatherQueryForm';
import WeatherQueryList from '../components/WeatherQueryList';
import { getCurrentWeather, getForecast } from '../utils/weatherApi';
import { WeatherData, ForecastData, WeatherQueryResponse } from '../types/weather';

export default function Home() {
  // Original weather search state
  const [location, setLocation] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  // Advanced features state
  const [activeTab, setActiveTab] = useState<'search' | 'queries'>('search');
  const [showQueryForm, setShowQueryForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch weather data for a given location (original functionality)
  const fetchWeatherData = async (locationQuery: string) => {
    if (!locationQuery.trim()) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch current weather and forecast in parallel
      const [currentWeather, forecastData] = await Promise.all([
        getCurrentWeather(locationQuery),
        getForecast(locationQuery)
      ]);

      setWeather(currentWeather);
      setForecast(forecastData);
    } catch (err) {
      setError('Failed to fetch weather data. Please check the location and try again.');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission (original functionality)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeatherData(location);
  };

  // Get user's current location using geolocation API (original functionality)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setGettingLocation(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const coordinates = `${latitude},${longitude}`;
        setLocation(coordinates);
        await fetchWeatherData(coordinates);
        setGettingLocation(false);
      },
      (error) => {
        setError('Unable to retrieve your location. Please enter it manually.');
        console.error('Geolocation error:', error);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000 // 10 minutes
      }
    );
  };

  // Handle new query creation
  const handleQueryCreated = (response: WeatherQueryResponse) => {
    setRefreshTrigger(prev => prev + 1);
    // Optionally switch to queries tab to show the new query
    setActiveTab('queries');
  };

  return (
    <>
      <Head>
        <title>SkyCast Advanced - AI-Powered Weather Intelligence</title>
        <meta name="description" content="Advanced weather forecasting with AI insights, data persistence, and intelligent recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 bg-clip-text text-transparent">
              SkyCast Advanced
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              AI-Powered Weather Intelligence with Smart Insights & Data Persistence
            </p>
            
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-900 p-1 rounded-lg border border-gray-700">
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-6 py-3 rounded-md transition-all duration-200 ${
                    activeTab === 'search'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  🌤️ Quick Weather Search
                </button>
                <button
                  onClick={() => setActiveTab('queries')}
                  className={`px-6 py-3 rounded-md transition-all duration-200 ${
                    activeTab === 'queries'
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  🤖 Advanced Weather Queries
                </button>
              </div>
            </div>
          </div>

          {/* Quick Weather Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-8">
              {/* Search Form */}
              <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Enter city, zip code, or coordinates (lat,lon)"
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                      disabled={loading || gettingLocation}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading || gettingLocation}
                      className="btn-primary flex items-center gap-2 min-w-[120px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          🔍 Search
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      disabled={loading || gettingLocation}
                      className="btn-secondary flex items-center gap-2 min-w-[140px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {gettingLocation ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Getting...
                        </>
                      ) : (
                        <>
                          📍 Use Location
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Location examples */}
                <div className="mt-4 text-sm text-gray-400">
                  <p className="mb-2">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {['London', 'New York', '10001', '40.7128,-74.0060', 'Tokyo', 'Sydney'].map((example) => (
                      <button
                        key={example}
                        onClick={() => setLocation(example)}
                        className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-full text-xs transition-colors duration-200"
                        disabled={loading || gettingLocation}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Upgrade Notice */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🚀</div>
                    <div>
                      <h3 className="font-semibold text-white">Want More Advanced Features?</h3>
                      <p className="text-sm text-gray-300 mt-1">
                        Switch to Advanced Queries for AI insights, data persistence, and smart recommendations!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('queries')}
                      className="ml-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Try Advanced
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg">
                    <p className="flex items-center gap-2">
                      <span>⚠️</span>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && !weather && (
                <div className="max-w-4xl mx-auto">
                  <div className="animate-pulse">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-8 h-96"></div>
                    <div className="flex gap-4 overflow-x-auto">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-gray-900 border border-gray-700 rounded-xl p-4 min-w-[140px] h-64"></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Weather Display */}
              {weather && !loading && (
                <div className="max-w-4xl mx-auto">
                  {/* Current Weather */}
                  <div className="mb-8">
                    <WeatherCard weather={weather} />
                  </div>

                  {/* 5-Day Forecast */}
                  {forecast && (
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        5-Day Forecast for {forecast.city.name}
                      </h2>
                      <div className="flex gap-4 overflow-x-auto pb-4">
                        {forecast.list.map((day, index) => (
                          <ForecastCard key={index} forecast={day} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Advanced Weather Queries Tab */}
          {activeTab === 'queries' && (
            <div className="space-y-8">
              {/* Header with Create Button */}
              <div className="flex justify-between items-center max-w-6xl mx-auto">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Advanced Weather Intelligence</h2>
                  <p className="text-gray-400">
                    Create weather queries with date ranges, get AI insights, and manage your weather data
                  </p>
                </div>
                <button
                  onClick={() => setShowQueryForm(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Weather Query
                </button>
              </div>

              {/* Features Overview */}
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-6">
                  <div className="text-3xl mb-3">🤖</div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI Weather Insights</h3>
                  <p className="text-gray-300 text-sm">
                    Get intelligent weather analysis, recommendations, and activity suggestions powered by advanced AI
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-6">
                  <div className="text-3xl mb-3">💾</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Data Persistence</h3>
                  <p className="text-gray-300 text-sm">
                    Save weather queries with date ranges, notes, and tags. Access your weather history anytime
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-6">
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Export & Analytics</h3>
                  <p className="text-gray-300 text-sm">
                    Export your weather data in multiple formats: JSON, CSV, XML, PDF, and Markdown
                  </p>
                </div>
              </div>

              {/* Weather Query List */}
              <div className="max-w-6xl mx-auto">
                <WeatherQueryList refreshTrigger={refreshTrigger} />
              </div>
            </div>
          )}

          {/* Weather Query Form Modal */}
          {showQueryForm && (
            <WeatherQueryForm
              onQueryCreated={handleQueryCreated}
              onClose={() => setShowQueryForm(false)}
            />
          )}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-700 py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-gray-400 text-sm">
              Built with ❤️ by Divyansh Jha • Powered by Next.js, TypeScript & AI
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
              <a 
                href="https://www.pmaccelerator.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl"
              >
                <span>🚀</span>
                Product Manager Accelerator Program
              </a>
              <div className="text-gray-400">
                Advanced Weather Intelligence Platform Demo
              </div>
            </div>
            <div className="text-gray-500 text-xs">
              © 2024 SkyCast. This project demonstrates full-stack development capabilities.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
} 