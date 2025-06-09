// Weather data interfaces for OpenWeatherMap API

export interface WeatherData {
  name: string;
  country: string;
  temperature: number;
  description: string;
  icon: string;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex?: number;
  clouds: number;
  sunrise: number;
  sunset: number;
}

export interface ForecastItem {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  pop: number; // Probability of precipitation
}

export interface ForecastData {
  city: {
    name: string;
    country: string;
  };
  list: ForecastItem[];
}

// Raw API response interfaces (for internal use)
export interface OpenWeatherCurrentResponse {
  name: string;
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  clouds: {
    all: number;
  };
  coord: {
    lat: number;
    lon: number;
  };
}

export interface OpenWeatherForecastResponse {
  city: {
    name: string;
    country: string;
  };
  list: Array<{
    dt: number;
    main: {
      temp_min: number;
      temp_max: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    wind: {
      speed: number;
    };
    pop: number;
  }>;
}

// ================= NEW ADVANCED TYPES =================

// Database storage types
export interface WeatherQuery {
  _id?: string;
  location: string;
  locationNormalized: string; // Standardized location name
  coordinates?: {
    lat: number;
    lon: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  weatherData: WeatherData;
  forecastData?: ForecastData;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  userNotes?: string;
}

// AI insights type
export interface AIInsight {
  _id?: string;
  queryId: string;
  location: string;
  insight: string;
  recommendations: string[];
  weatherSummary: string;
  travelAdvice?: string;
  clothingRecommendations?: string[];
  activitySuggestions?: string[];
  generatedAt: Date;
  model: string; // OpenRouter model used
}

// Location intelligence
export interface LocationMatch {
  name: string;
  country: string;
  state?: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  confidence: number;
}

// Location context (replaces YouTube videos)
export interface LocationContext {
  facts: string[];
  activities: string[];
  seasonalInfo: string;
  localTime: string;
  timezone: string;
  weatherTips: string[];
}

// Export formats
export type ExportFormat = 'json' | 'csv' | 'xml' | 'pdf' | 'markdown';

export interface ExportData {
  queries: WeatherQuery[];
  insights: AIInsight[];
  exportedAt: Date;
  format: ExportFormat;
}

// Date range validation
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface DateRangeValidation {
  isValid: boolean;
  errors: string[];
  adjustedRange?: DateRange;
}

// API request/response types
export interface CreateWeatherQueryRequest {
  location: string;
  dateRange: DateRange;
  userNotes?: string;
  tags?: string[];
}

export interface UpdateWeatherQueryRequest {
  location?: string;
  dateRange?: DateRange;
  userNotes?: string;
  tags?: string[];
}

export interface WeatherQueryResponse {
  query: WeatherQuery;
  aiInsight?: AIInsight;
  locationContext?: LocationContext;
}

// Search and filter types
export interface WeatherQueryFilters {
  location?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  hasAIInsight?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Error handling
export interface APIError {
  message: string;
  code: string;
  details?: any;
} 