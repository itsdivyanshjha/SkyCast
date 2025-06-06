import { ForecastItem } from '../types/weather';
import { getWeatherIconUrl } from '../utils/weatherApi';

interface ForecastCardProps {
  forecast: ForecastItem;
}

export default function ForecastCard({ forecast }: ForecastCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-white text-center min-w-[140px]">
      {/* Date */}
      <div className="text-sm font-semibold mb-2 text-gray-300">
        {forecast.date}
      </div>

      {/* Weather Icon */}
      <div className="mb-3">
        <img
          src={getWeatherIconUrl(forecast.icon)}
          alt={forecast.description}
          className="w-12 h-12 mx-auto"
        />
      </div>

      {/* Temperature Range */}
      <div className="mb-2">
        <div className="text-lg font-bold">{forecast.temperature.max}°</div>
        <div className="text-sm text-gray-400">{forecast.temperature.min}°</div>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-300 capitalize mb-3">
        {forecast.description}
      </div>

      {/* Additional Details */}
      <div className="space-y-1 text-xs">
        {/* Precipitation */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Rain:</span>
          <span className="text-blue-400">{forecast.pop}%</span>
        </div>

        {/* Humidity */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Humidity:</span>
          <span className="text-gray-300">{forecast.humidity}%</span>
        </div>

        {/* Wind */}
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Wind:</span>
          <span className="text-gray-300">{forecast.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
} 