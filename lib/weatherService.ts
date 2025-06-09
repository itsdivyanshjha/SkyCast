import { getDatabase, COLLECTIONS } from './mongodb';
import { 
  WeatherQuery, 
  AIInsight, 
  DateRange, 
  DateRangeValidation, 
  LocationMatch,
  WeatherQueryFilters,
  PaginatedResponse,
  CreateWeatherQueryRequest,
  UpdateWeatherQueryRequest,
  WeatherQueryResponse
} from '../types/weather';
import { getCurrentWeather, getForecast } from '../utils/weatherApi';
import { aiService } from './aiService';
import { format, isAfter, isBefore, isValid, parseISO } from 'date-fns';
import Fuse from 'fuse.js';
import { locationContextService } from './locationContextService';

// Common city names for fuzzy matching
const COMMON_LOCATIONS = [
  { name: 'New York', country: 'US', state: 'NY' },
  { name: 'London', country: 'GB' },
  { name: 'Tokyo', country: 'JP' },
  { name: 'Paris', country: 'FR' },
  { name: 'Sydney', country: 'AU' },
  { name: 'Los Angeles', country: 'US', state: 'CA' },
  { name: 'Chicago', country: 'US', state: 'IL' },
  { name: 'Toronto', country: 'CA' },
  { name: 'Berlin', country: 'DE' },
  { name: 'Mumbai', country: 'IN' },
  { name: 'Singapore', country: 'SG' },
  { name: 'Dubai', country: 'AE' },
  { name: 'São Paulo', country: 'BR' },
  { name: 'Mexico City', country: 'MX' },
  { name: 'Moscow', country: 'RU' },
];

export class WeatherService {
  private fuse: Fuse<LocationMatch>;

  constructor() {
    this.fuse = new Fuse([], {
      keys: ['name', 'country', 'state'],
      threshold: 0.3,
    });
  }

  // =================== VALIDATION METHODS ===================

  validateDateRange(dateRange: DateRange): DateRangeValidation {
    const errors: string[] = [];
    const { startDate, endDate } = dateRange;

    // Check if dates are valid
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    if (!isValid(start)) {
      errors.push('Start date is invalid');
    }

    if (!isValid(end)) {
      errors.push('End date is invalid');
    }

    if (errors.length === 0) {
      // Check date range logic
      if (isAfter(start, end)) {
        errors.push('Start date cannot be after end date');
      }

      // Check if date range is too far in the past
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (isBefore(start, oneYearAgo)) {
        errors.push('Historical weather data is limited to the past year');
      }

      // Check if date range is too far in the future (OpenWeatherMap free tier: 5 days)
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      
      if (isAfter(start, fiveDaysFromNow)) {
        errors.push('Weather forecasts are only available for the next 5 days with OpenWeatherMap free tier');
      }
      
      // Provide helpful message for future planning
      if (isAfter(end, fiveDaysFromNow)) {
        errors.push('For long-term planning beyond 5 days, consider using current weather patterns and seasonal trends');
      }
    }

    const adjustedRange = errors.length === 0 ? dateRange : {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    };

    return {
      isValid: errors.length === 0,
      errors,
      adjustedRange
    };
  }

  async validateLocation(location: string): Promise<LocationMatch[]> {
    try {
      // First try exact match with weather API
      const weatherData = await getCurrentWeather(location);
      if (weatherData) {
        return [{
          name: weatherData.name,
          country: weatherData.country,
          coordinates: { lat: 0, lon: 0 }, // We don't get coords from current API
          confidence: 1.0
        }];
      }
    } catch (error) {
      // Location not found via weather API, try fuzzy matching
    }

    // Fuzzy match against common locations
    const fuzzyResults = this.fuse.search(location);
    return fuzzyResults.map(result => ({
      name: result.item.name,
      country: result.item.country,
      state: result.item.state,
      coordinates: { lat: 0, lon: 0 },
      confidence: 1 - result.score!
    }));
  }

  private normalizeLocation(location: string): string {
    return location.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  // =================== CRUD OPERATIONS ===================

  async createWeatherQuery(request: CreateWeatherQueryRequest): Promise<WeatherQuery> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WEATHER_QUERIES);

    // Validate date range
    const dateValidation = this.validateDateRange(request.dateRange);
    if (!dateValidation.isValid) {
      throw new Error(`Invalid date range: ${dateValidation.errors.join(', ')}`);
    }

    // Validate location
    const locationMatches = await this.validateLocation(request.location);
    if (locationMatches.length === 0) {
      throw new Error(`Location "${request.location}" not found. Please check the spelling and try again.`);
    }

    const bestMatch = locationMatches[0];
    const finalLocation = bestMatch.confidence > 0.8 ? bestMatch.name : request.location;

    try {
      // Fetch weather data
      const [weatherData, forecastData] = await Promise.all([
        getCurrentWeather(finalLocation),
        getForecast(finalLocation).catch(() => null) // Forecast is optional
      ]);

      // Create weather query document
      const weatherQuery: Omit<WeatherQuery, '_id'> = {
        location: request.location,
        locationNormalized: this.normalizeLocation(finalLocation),
        coordinates: bestMatch.coordinates,
        dateRange: dateValidation.adjustedRange || request.dateRange,
        weatherData,
        forecastData: forecastData || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: request.tags || [],
        userNotes: request.userNotes || ''
      };

      const result = await collection.insertOne(weatherQuery);
      const created = await collection.findOne({ _id: result.insertedId });

      if (!created) {
        throw new Error('Failed to create weather query');
      }

      return {
        ...created,
        _id: created._id.toString()
      } as WeatherQuery;

    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWeatherQuery(id: string): Promise<WeatherQuery | null> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WEATHER_QUERIES);

    try {
      const { ObjectId } = await import('mongodb');
      const query = await collection.findOne({ _id: new ObjectId(id) });
      
      if (!query) {
        return null;
      }

      return {
        ...query,
        _id: query._id.toString()
      } as WeatherQuery;
      
    } catch (error) {
      console.error('Error fetching weather query:', error);
      return null;
    }
  }

  async updateWeatherQuery(id: string, updates: UpdateWeatherQueryRequest): Promise<WeatherQuery | null> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WEATHER_QUERIES);

    try {
      const { ObjectId } = await import('mongodb');
      const updateDoc: any = {
        updatedAt: new Date()
      };

      // Handle location update
      if (updates.location) {
        const locationMatches = await this.validateLocation(updates.location);
        if (locationMatches.length === 0) {
          throw new Error(`Location "${updates.location}" not found`);
        }
        
        const bestMatch = locationMatches[0];
        const finalLocation = bestMatch.confidence > 0.8 ? bestMatch.name : updates.location;
        
        // Fetch new weather data for updated location
        const [weatherData, forecastData] = await Promise.all([
          getCurrentWeather(finalLocation),
          getForecast(finalLocation).catch(() => null)
        ]);

        updateDoc.location = updates.location;
        updateDoc.locationNormalized = this.normalizeLocation(finalLocation);
        updateDoc.coordinates = bestMatch.coordinates;
        updateDoc.weatherData = weatherData;
        if (forecastData) {
          updateDoc.forecastData = forecastData;
        }
      }

      // Handle date range update
      if (updates.dateRange) {
        const dateValidation = this.validateDateRange(updates.dateRange);
        if (!dateValidation.isValid) {
          throw new Error(`Invalid date range: ${dateValidation.errors.join(', ')}`);
        }
        updateDoc.dateRange = dateValidation.adjustedRange || updates.dateRange;
      }

      // Handle other updates
      if (updates.userNotes !== undefined) {
        updateDoc.userNotes = updates.userNotes;
      }
      if (updates.tags !== undefined) {
        updateDoc.tags = updates.tags;
      }

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        return null;
      }

      return {
        ...result.value,
        _id: result.value._id.toString()
      } as WeatherQuery;

    } catch (error) {
      throw new Error(`Failed to update weather query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteWeatherQuery(id: string): Promise<boolean> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WEATHER_QUERIES);

    try {
      const { ObjectId } = await import('mongodb');
      
      // Also delete associated AI insights
      const insightsCollection = db.collection(COLLECTIONS.AI_INSIGHTS);
      await insightsCollection.deleteMany({ queryId: id });
      
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount === 1;
      
    } catch (error) {
      console.error('Error deleting weather query:', error);
      return false;
    }
  }

  async listWeatherQueries(
    filters: WeatherQueryFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<WeatherQuery>> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.WEATHER_QUERIES);

    // Build query
    const query: any = {};
    
    if (filters.location) {
      query.locationNormalized = { $regex: this.normalizeLocation(filters.location), $options: 'i' };
    }
    
    if (filters.dateFrom || filters.dateTo) {
      query['dateRange.startDate'] = {};
      if (filters.dateFrom) {
        query['dateRange.startDate'].$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query['dateRange.startDate'].$lte = filters.dateTo;
      }
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    const skip = (page - 1) * limit;
    
    try {
      const [data, totalCount] = await Promise.all([
        collection
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query)
      ]);

      const formattedData = data.map(item => ({
        ...item,
        _id: item._id.toString()
      })) as WeatherQuery[];

      return {
        data: formattedData,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      };
      
    } catch (error) {
      console.error('Error listing weather queries:', error);
      throw new Error('Failed to fetch weather queries');
    }
  }

  // =================== AI INSIGHTS ===================

  async generateAIInsight(queryId: string): Promise<AIInsight | null> {
    const weatherQuery = await this.getWeatherQuery(queryId);
    if (!weatherQuery) {
      throw new Error('Weather query not found');
    }

    if (!aiService.isAvailable()) {
      throw new Error('AI service is not available');
    }

    try {
      const insightData = await aiService.generateWeatherInsight(
        weatherQuery.location,
        weatherQuery.weatherData,
        weatherQuery.forecastData
      );

      const aiInsight: Omit<AIInsight, '_id'> = {
        queryId,
        location: weatherQuery.location,
        insight: insightData.insight || '',
        recommendations: insightData.recommendations || [],
        weatherSummary: insightData.weatherSummary || '',
        travelAdvice: insightData.travelAdvice,
        clothingRecommendations: insightData.clothingRecommendations,
        activitySuggestions: await aiService.generateActivitySuggestions(
          weatherQuery.location,
          weatherQuery.weatherData,
          weatherQuery.dateRange
        ),
        generatedAt: new Date(),
        model: insightData.model || 'unknown'
      };

      // Save to database
      const db = await getDatabase();
      const collection = db.collection(COLLECTIONS.AI_INSIGHTS);
      const result = await collection.insertOne(aiInsight);
      
      const created = await collection.findOne({ _id: result.insertedId });
      if (!created) {
        throw new Error('Failed to save AI insight');
      }

      return {
        ...created,
        _id: created._id.toString()
      } as AIInsight;

    } catch (error) {
      throw new Error(`Failed to generate AI insight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAIInsight(queryId: string): Promise<AIInsight | null> {
    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.AI_INSIGHTS);

    try {
      const insight = await collection.findOne({ queryId });
      if (!insight) {
        return null;
      }

      return {
        ...insight,
        _id: insight._id.toString()
      } as AIInsight;
      
    } catch (error) {
      console.error('Error fetching AI insight:', error);
      return null;
    }
  }

  async getWeatherQueryResponse(query: WeatherQuery): Promise<WeatherQueryResponse> {
    try {
      // Get AI insight
      const aiInsight = await generateWeatherInsight(
        query.location,
        query.weatherData,
        query.forecastData
      );

      // Get location context (replaces YouTube videos)
      const locationContext = locationContextService.getLocationContext(
        query.location,
        query.weatherData,
        query.forecastData
      );

      return {
        query,
        aiInsight,
        locationContext
      };
    } catch (error) {
      console.error('Error getting weather query response:', error);
      return {
        query,
        locationContext: locationContextService.getLocationContext(
          query.location,
          query.weatherData,
          query.forecastData
        )
      };
    }
  }
}

export const weatherService = new WeatherService(); 