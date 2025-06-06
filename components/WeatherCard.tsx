import { WeatherData } from '../types/weather';
import { getWeatherIconUrl } from '../utils/weatherApi';

interface WeatherCardProps {
  weather: WeatherData;
}

export default function WeatherCard({ weather }: WeatherCardProps) {
  // Format time from timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get wind direction text
  const getWindDirection = (degrees: number) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{weather.name}</h2>
          <p className="text-gray-300">{weather.country}</p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold">{weather.temperature}°C</div>
          <div className="text-gray-300 capitalize">{weather.description}</div>
        </div>
      </div>

      {/* Weather Icon and Main Info */}
      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <img
            src={getWeatherIconUrl(weather.icon)}
            alt={weather.description}
            className="w-20 h-20 mx-auto mb-2"
          />
          <div className="text-lg">Feels like {weather.feelsLike}°C</div>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {/* Humidity */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">💧</div>
          <div className="font-semibold">{weather.humidity}%</div>
          <div className="text-gray-400">Humidity</div>
        </div>

        {/* Wind */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">💨</div>
          <div className="font-semibold">{weather.windSpeed} km/h</div>
          <div className="text-gray-400">{getWindDirection(weather.windDirection)}</div>
        </div>

        {/* Pressure */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">📊</div>
          <div className="font-semibold">{weather.pressure} hPa</div>
          <div className="text-gray-400">Pressure</div>
        </div>

        {/* Visibility */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">👁️</div>
          <div className="font-semibold">{weather.visibility} km</div>
          <div className="text-gray-400">Visibility</div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {/* Clouds */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">☁️</div>
          <div className="font-semibold">{weather.clouds}%</div>
          <div className="text-gray-400">Cloudiness</div>
        </div>

        {/* Sun Times */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">🌅</div>
          <div className="font-semibold text-xs">
            ↑ {formatTime(weather.sunrise)}
          </div>
          <div className="font-semibold text-xs">
            ↓ {formatTime(weather.sunset)}
          </div>
          <div className="text-gray-400">Sun</div>
        </div>
      </div>
    </div>
  );
} 