import { useState, useEffect } from 'react';
import Head from 'next/head';
import WeatherCard from '../components/WeatherCard';
import ForecastCard from '../components/ForecastCard';
import { getCurrentWeather, getForecast } from '../utils/weatherApi';
import { WeatherData, ForecastData } from '../types/weather';

export default function Home() {
  // State management
  const [location, setLocation] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [gettingLocation, setGettingLocation] = useState<boolean>(false);

  // Fetch weather data for a given location
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeatherData(location);
  };

  // Get user's current location using geolocation API
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

  return (
    <>
      <Head>
        <title>SkyCast - Weather Forecast App</title>
        <meta name="description" content="Get current weather and 5-day forecast for any location" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              SkyCast
            </h1>
            <p className="text-gray-300 text-lg">
              Get current weather and 5-day forecast for any location
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-2xl mx-auto mb-8">
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
          </div>

          {/* Error Message */}
          {error && (
            <div className="max-w-2xl mx-auto mb-8">
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
                  <h2 className="text-2xl font-bold mb-6 text-center">
                    5-Day Forecast for {forecast.city.name}, {forecast.city.country}
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

          {/* Instructions */}
          {!weather && !loading && !error && (
            <div className="max-w-2xl mx-auto text-center">
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-8">
                <h2 className="text-2xl font-semibold mb-4">Welcome to SkyCast!</h2>
                <div className="text-gray-300 space-y-4">
                  <p>Enter a location above to get started. You can search by:</p>
                  <ul className="text-left space-y-2">
                    <li>• <strong>City name:</strong> London, Paris, Tokyo</li>
                    <li>• <strong>City, Country:</strong> London, UK</li>
                    <li>• <strong>ZIP code:</strong> 10001, SW1A 1AA</li>
                    <li>• <strong>Coordinates:</strong> 40.7128,-74.0060</li>
                  </ul>
                  <p>Or click "Use Location" to get weather for your current location!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 py-8 border-t border-gray-800">
          <div className="container mx-auto px-4 text-center text-gray-400">
            <p>
              Made by Divyansh Jha | 
              Powered by <a href="https://openweathermap.org/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">OpenWeatherMap</a>
            </p>
          </div>
        </footer>
      </main>
    </>
  );
} 