import axios from 'axios';
import { WeatherData, ForecastData, OpenWeatherCurrentResponse, OpenWeatherForecastResponse } from '../types/weather';

// OpenWeatherMap API configuration
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || 'your_api_key_here';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Helper function to determine if input is coordinates
const isCoordinates = (location: string): boolean => {
  const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
  return coordPattern.test(location.replace(/\s/g, ''));
};

// Helper function to convert temperature from Kelvin to Celsius
const kelvinToCelsius = (kelvin: number): number => {
  return Math.round(kelvin - 273.15);
};

// Helper function to format date for forecast
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Get current weather data
export const getCurrentWeather = async (location: string): Promise<WeatherData> => {
  try {
    // Check if API key is properly configured
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      throw new Error('API key not configured. Please add your OpenWeatherMap API key to .env.local');
    }

    let url = `${BASE_URL}/weather?appid=${API_KEY}&units=metric`;
    
    if (isCoordinates(location)) {
      const [lat, lon] = location.split(',').map(coord => coord.trim());
      url += `&lat=${lat}&lon=${lon}`;
    } else {
      url += `&q=${encodeURIComponent(location)}`;
    }

    const response = await axios.get<OpenWeatherCurrentResponse>(url);
    const data = response.data;

    // Transform the API response to our WeatherData interface
    const weatherData: WeatherData = {
      name: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      windDirection: data.wind.deg,
      visibility: Math.round(data.visibility / 1000), // Convert to km
      clouds: data.clouds.all,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
    };

    return weatherData;
  } catch (error) {
    console.error('Error fetching current weather:', error);
    throw new Error('Failed to fetch current weather data');
  }
};

// Get 5-day weather forecast
export const getForecast = async (location: string): Promise<ForecastData> => {
  try {
    let url = `${BASE_URL}/forecast?appid=${API_KEY}&units=metric`;
    
    if (isCoordinates(location)) {
      const [lat, lon] = location.split(',').map(coord => coord.trim());
      url += `&lat=${lat}&lon=${lon}`;
    } else {
      url += `&q=${encodeURIComponent(location)}`;
    }

    const response = await axios.get<OpenWeatherForecastResponse>(url);
    const data = response.data;

    // Group forecast data by day and get daily min/max temperatures
    const dailyForecasts: { [key: string]: any } = {};
    
    data.list.forEach(item => {
      const date = formatDate(item.dt);
      
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = {
          date,
          temperatures: [item.main.temp_min, item.main.temp_max],
          description: item.weather[0].description,
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed * 3.6), // Convert m/s to km/h
          pop: Math.round(item.pop * 100), // Convert to percentage
        };
      } else {
        // Update min/max temperatures
        dailyForecasts[date].temperatures.push(item.main.temp_min, item.main.temp_max);
      }
    });

    // Transform to our ForecastData interface
    const forecastList = Object.values(dailyForecasts).map((day: any) => ({
      date: day.date,
      temperature: {
        min: Math.round(Math.min(...day.temperatures)),
        max: Math.round(Math.max(...day.temperatures)),
      },
      description: day.description,
      icon: day.icon,
      humidity: day.humidity,
      windSpeed: day.windSpeed,
      pop: day.pop,
    }));

    const forecastData: ForecastData = {
      city: {
        name: data.city.name,
        country: data.city.country,
      },
      list: forecastList.slice(0, 5), // Get only 5 days
    };

    return forecastData;
  } catch (error) {
    console.error('Error fetching forecast:', error);
    throw new Error('Failed to fetch forecast data');
  }
};

// Helper function to get weather icon URL
export const getWeatherIconUrl = (iconCode: string): string => {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}; 