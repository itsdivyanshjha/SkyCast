import { NextApiRequest, NextApiResponse } from 'next';
import { weatherService } from '../../../lib/weatherService';
import { CreateWeatherQueryRequest, WeatherQueryFilters } from '../../../types/weather';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res);
        break;
      case 'POST':
        await handlePost(req, res);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { 
    location, 
    dateFrom, 
    dateTo, 
    tags, 
    hasAIInsight,
    page = '1', 
    limit = '10' 
  } = req.query;

  // Build filters
  const filters: WeatherQueryFilters = {};
  
  if (location && typeof location === 'string') {
    filters.location = location;
  }
  
  if (dateFrom && typeof dateFrom === 'string') {
    filters.dateFrom = dateFrom;
  }
  
  if (dateTo && typeof dateTo === 'string') {
    filters.dateTo = dateTo;
  }
  
  if (tags) {
    filters.tags = Array.isArray(tags) ? tags as string[] : [tags as string];
  }
  
  if (hasAIInsight && typeof hasAIInsight === 'string') {
    filters.hasAIInsight = hasAIInsight === 'true';
  }

  // Parse pagination
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = Math.min(parseInt(limit as string, 10) || 10, 50); // Max 50 per page

  try {
    const result = await weatherService.listWeatherQueries(filters, pageNum, limitNum);
    res.status(200).json(result);
  } catch (error) {
    throw error;
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { location, dateRange, userNotes, tags }: CreateWeatherQueryRequest = req.body;

  // Validate required fields
  if (!location || !dateRange) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Location and date range are required'
    });
  }

  if (!dateRange.startDate || !dateRange.endDate) {
    return res.status(400).json({
      error: 'Invalid date range',
      message: 'Both start date and end date are required'
    });
  }

  try {
    // Create the weather query
    const weatherQuery = await weatherService.createWeatherQuery({
      location,
      dateRange,
      userNotes,
      tags
    });

    // Try to generate AI insight if service is available
    let aiInsight = null;
    try {
      if (weatherQuery._id) {
        aiInsight = await weatherService.generateAIInsight(weatherQuery._id);
      }
    } catch (aiError) {
      console.warn('Failed to generate AI insight:', aiError);
      // Don't fail the whole request if AI insight fails
    }

    // Get location context using the simple built-in service
    let locationContext = null;
    try {
      const { locationContextService } = await import('../../../lib/locationContextService');
      locationContext = locationContextService.getLocationContext(
        location,
        weatherQuery.weatherData,
        weatherQuery.forecastData
      );
    } catch (contextError) {
      console.warn('Failed to fetch location context:', contextError);
      // Don't fail the whole request if context fetch fails
    }

    // Return the complete response
    res.status(201).json({
      query: weatherQuery,
      aiInsight,
      locationContext
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid date range')) {
        return res.status(400).json({
          error: 'Invalid date range',
          message: error.message
        });
      }
      
      if (error.message.includes('not found')) {
        return res.status(400).json({
          error: 'Location not found',
          message: error.message
        });
      }
    }
    
    throw error;
  }
} 