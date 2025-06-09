import { WeatherData, ForecastData } from '../types/weather';

interface LocationContext {
  facts: string[];
  activities: string[];
  seasonalInfo: string;
  localTime: string;
  timezone: string;
  weatherTips: string[];
}

interface LocationInfo {
  name: string;
  facts: string[];
  activities: string[];
  climate: string;
  timezone?: string;
}

// Built-in location database (much simpler than YouTube API!)
const LOCATION_DATABASE: { [key: string]: LocationInfo } = {
  'london': {
    name: 'London, UK',
    facts: [
      'London experiences a temperate oceanic climate with mild temperatures year-round',
      'The city sees about 150 rainy days per year, so always carry an umbrella!',
      'London\'s weather is influenced by the Gulf Stream, keeping it warmer than other cities at similar latitudes'
    ],
    activities: ['Visit museums on rainy days', 'Enjoy Hyde Park when sunny', 'Take river walks along Thames'],
    climate: 'Temperate oceanic with mild winters and cool summers',
    timezone: 'Europe/London'
  },
  'new york': {
    name: 'New York City, USA',
    facts: [
      'NYC has a humid subtropical climate with hot summers and cold winters',
      'The city experiences all four seasons distinctly throughout the year',
      'Weather can change rapidly due to its location between land and ocean'
    ],
    activities: ['Central Park activities', 'Rooftop bars in summer', 'Ice skating in winter'],
    climate: 'Humid subtropical with four distinct seasons',
    timezone: 'America/New_York'
  },
  'tokyo': {
    name: 'Tokyo, Japan',
    facts: [
      'Tokyo has a humid subtropical climate with a distinct rainy season (tsuyu)',
      'Cherry blossom season (spring) is one of the most beautiful times to visit',
      'Summer can be very hot and humid with temperatures often exceeding 30°C'
    ],
    activities: ['Cherry blossom viewing in spring', 'Temple visits', 'Seasonal festivals'],
    climate: 'Humid subtropical with distinct wet and dry seasons',
    timezone: 'Asia/Tokyo'
  },
  'paris': {
    name: 'Paris, France',
    facts: [
      'Paris enjoys a temperate climate with relatively mild temperatures',
      'Spring and fall are considered the best times to visit for pleasant weather',
      'Summer days are long with sunset occurring after 9 PM'
    ],
    activities: ['Seine river walks', 'Outdoor café dining', 'Park picnics'],
    climate: 'Temperate with warm summers and cool winters',
    timezone: 'Europe/Paris'
  },
  'sydney': {
    name: 'Sydney, Australia',
    facts: [
      'Sydney has a humid subtropical climate with warm summers and mild winters',
      'Being in the Southern Hemisphere, seasons are opposite to the Northern Hemisphere',
      'The city enjoys over 260 sunny days per year'
    ],
    activities: ['Beach activities', 'Harbour walks', 'Outdoor barbecues'],
    climate: 'Humid subtropical with mild winters and warm summers',
    timezone: 'Australia/Sydney'
  },
  'dubai': {
    name: 'Dubai, UAE',
    facts: [
      'Dubai has a hot desert climate with very hot summers and warm winters',
      'Rainfall is extremely rare, occurring mainly in winter months',
      'Humidity can be high due to its coastal location on the Persian Gulf'
    ],
    activities: ['Indoor malls during hot weather', 'Desert safaris', 'Beach activities in winter'],
    climate: 'Hot desert climate with minimal rainfall',
    timezone: 'Asia/Dubai'
  },
  'mumbai': {
    name: 'Mumbai, India',
    facts: [
      'Mumbai has a tropical climate with three distinct seasons',
      'The monsoon season brings heavy rainfall from June to September',
      'High humidity throughout the year due to its coastal location'
    ],
    activities: ['Monsoon photography', 'Beach visits in winter', 'Indoor activities during heavy rains'],
    climate: 'Tropical with distinct monsoon season',
    timezone: 'Asia/Kolkata'
  },
  'singapore': {
    name: 'Singapore',
    facts: [
      'Singapore has a tropical rainforest climate with consistent temperatures year-round',
      'Afternoon thunderstorms are common, especially during monsoon seasons',
      'High humidity levels throughout the year, typically above 80%'
    ],
    activities: ['Indoor attractions during rain', 'Gardens and parks in good weather', 'Night markets'],
    climate: 'Tropical rainforest with high humidity',
    timezone: 'Asia/Singapore'
  }
};

class LocationContextService {
  
  getLocationContext(location: string, weatherData: WeatherData, forecastData?: ForecastData): LocationContext {
    const normalizedLocation = this.normalizeLocationName(location);
    const locationInfo = this.findLocationInfo(normalizedLocation);
    
    return {
      facts: locationInfo.facts,
      activities: this.generateActivities(weatherData, locationInfo.activities),
      seasonalInfo: this.getSeasonalInfo(location, weatherData),
      localTime: this.getLocalTime(locationInfo.timezone),
      timezone: locationInfo.timezone || 'Unknown',
      weatherTips: this.generateWeatherTips(weatherData, forecastData)
    };
  }

  private normalizeLocationName(location: string): string {
    return location.toLowerCase()
      .replace(/,.*$/, '') // Remove country/state part
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findLocationInfo(normalizedLocation: string): LocationInfo {
    // Try exact match first
    if (LOCATION_DATABASE[normalizedLocation]) {
      return LOCATION_DATABASE[normalizedLocation];
    }

    // Try partial match
    const partialMatch = Object.keys(LOCATION_DATABASE).find(key => 
      normalizedLocation.includes(key) || key.includes(normalizedLocation)
    );

    if (partialMatch) {
      return LOCATION_DATABASE[partialMatch];
    }

    // Default fallback
    return {
      name: location,
      facts: [
        'This location has its own unique weather patterns and climate characteristics',
        'Local weather can be influenced by geographical features like mountains, oceans, or elevation',
        'Weather conditions may vary significantly throughout different seasons'
      ],
      activities: ['Explore local attractions', 'Check local weather before outdoor activities', 'Enjoy seasonal activities'],
      climate: 'Varies by season and geographical location'
    };
  }

  private generateActivities(weatherData: WeatherData, defaultActivities: string[]): string[] {
    const activities = [...defaultActivities];
    const temp = weatherData.temperature;
    const description = weatherData.description.toLowerCase();

    // Add weather-specific activities
    if (temp > 25) {
      activities.push('Great weather for outdoor activities and sightseeing');
      activities.push('Perfect for picnics and outdoor dining');
    } else if (temp < 5) {
      activities.push('Ideal for cozy indoor activities and hot beverages');
      activities.push('Good time for museums and indoor entertainment');
    }

    if (description.includes('rain')) {
      activities.push('Perfect weather for indoor museums and cafes');
      activities.push('Great time for shopping centers and galleries');
    } else if (description.includes('clear') || description.includes('sunny')) {
      activities.push('Excellent conditions for walking tours and photography');
      activities.push('Perfect for outdoor markets and street food');
    }

    if (weatherData.windSpeed > 20) {
      activities.push('Good conditions for wind sports if available');
    }

    return activities.slice(0, 6); // Limit to 6 activities
  }

  private getSeasonalInfo(location: string, weatherData: WeatherData): string {
    const currentMonth = new Date().getMonth(); // 0-11
    const temp = weatherData.temperature;
    
    // Determine hemisphere (simple heuristic)
    const isNorthern = !location.toLowerCase().includes('australia') && 
                      !location.toLowerCase().includes('new zealand') &&
                      !location.toLowerCase().includes('south africa');

    const seasons = isNorthern 
      ? ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter']
      : ['Summer', 'Summer', 'Fall', 'Fall', 'Fall', 'Winter', 'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer'];

    const currentSeason = seasons[currentMonth];
    
    let seasonalAdvice = `Currently ${currentSeason.toLowerCase()} season in this region. `;
    
    if (currentSeason === 'Summer' && temp > 25) {
      seasonalAdvice += 'Typical warm summer weather - stay hydrated and use sun protection.';
    } else if (currentSeason === 'Winter' && temp < 10) {
      seasonalAdvice += 'Winter conditions - dress warmly and be prepared for shorter daylight hours.';
    } else if (currentSeason === 'Spring') {
      seasonalAdvice += 'Spring weather can be variable - layer clothing for changing conditions.';
    } else if (currentSeason === 'Fall') {
      seasonalAdvice += 'Autumn weather - great time for outdoor activities with comfortable temperatures.';
    } else {
      seasonalAdvice += 'Weather conditions are moderate for this time of year.';
    }

    return seasonalAdvice;
  }

  private getLocalTime(timezone?: string): string {
    try {
      if (timezone) {
        return new Date().toLocaleString('en-US', {
          timeZone: timezone,
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        });
      } else {
        return new Date().toLocaleString('en-US', {
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      return new Date().toLocaleString('en-US', {
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  private generateWeatherTips(weatherData: WeatherData, forecastData?: ForecastData): string[] {
    const tips: string[] = [];
    const temp = weatherData.temperature;
    const humidity = weatherData.humidity;
    const windSpeed = weatherData.windSpeed;
    const description = weatherData.description.toLowerCase();

    // Temperature-based tips
    if (temp > 30) {
      tips.push('Very hot weather - stay hydrated and avoid prolonged sun exposure');
      tips.push('Use SPF 30+ sunscreen and seek shade during peak hours (10 AM - 4 PM)');
    } else if (temp < 0) {
      tips.push('Freezing temperatures - dress in layers and protect exposed skin');
      tips.push('Be cautious of icy conditions when walking or driving');
    } else if (temp < 10) {
      tips.push('Cold weather - wear warm clothing and consider a jacket');
    }

    // Humidity-based tips
    if (humidity > 80) {
      tips.push('High humidity - you may feel warmer than the actual temperature');
      tips.push('Stay hydrated and take breaks in air-conditioned spaces if needed');
    } else if (humidity < 30) {
      tips.push('Low humidity - use moisturizer and stay hydrated');
    }

    // Wind-based tips
    if (windSpeed > 25) {
      tips.push('Strong winds - secure loose items and be cautious with umbrellas');
    }

    // Weather condition tips
    if (description.includes('rain')) {
      tips.push('Rainy conditions - carry an umbrella and wear waterproof clothing');
      tips.push('Allow extra time for travel due to wet conditions');
    } else if (description.includes('snow')) {
      tips.push('Snowy conditions - wear appropriate footwear and dress warmly');
      tips.push('Check transportation schedules as they may be affected');
    } else if (description.includes('clear') || description.includes('sunny')) {
      tips.push('Clear skies - great visibility and pleasant conditions for outdoor activities');
    }

    // Forecast-based tips
    if (forecastData && forecastData.list.length > 0) {
      const hasRainSoon = forecastData.list.some(day => day.pop > 50);
      if (hasRainSoon) {
        tips.push('Rain expected in the coming days - plan indoor alternatives');
      }
    }

    return tips.slice(0, 4); // Limit to 4 tips
  }

  // Add location to database dynamically
  addLocationInfo(location: string, info: LocationInfo): void {
    const normalized = this.normalizeLocationName(location);
    LOCATION_DATABASE[normalized] = info;
  }

  // Get available locations
  getAvailableLocations(): string[] {
    return Object.keys(LOCATION_DATABASE).map(key => LOCATION_DATABASE[key].name);
  }
}

export const locationContextService = new LocationContextService(); 