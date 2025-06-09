import { NextApiRequest, NextApiResponse } from 'next';
import { weatherService } from '../../../lib/weatherService';
import { UpdateWeatherQueryRequest } from '../../../types/weather';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Weather query ID is required'
    });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGet(req, res, id);
        break;
      case 'PUT':
        await handlePut(req, res, id);
        break;
      case 'DELETE':
        await handleDelete(req, res, id);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
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

async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const weatherQuery = await weatherService.getWeatherQuery(id);
    
    if (!weatherQuery) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Weather query not found'
      });
    }

    // Try to get associated AI insight
    let aiInsight = null;
    try {
      aiInsight = await weatherService.getAIInsight(id);
    } catch (error) {
      console.warn('Failed to fetch AI insight:', error);
      // Don't fail the request if AI insight fetch fails
    }

    // Get location context
    const { locationContextService } = await import('../../../lib/locationContextService');
    const locationContext = locationContextService.getLocationContext(
      weatherQuery.location,
      weatherQuery.weatherData,
      weatherQuery.forecastData
    );

    // Include location context in AI insight or as separate field
    if (aiInsight) {
      aiInsight.locationContext = locationContext;
    }

    res.status(200).json({
      query: weatherQuery,
      aiInsight,
      locationContext
    });
  } catch (error) {
    throw error;
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  const updates: UpdateWeatherQueryRequest = req.body;

  // Validate that we have something to update
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'No updates provided'
    });
  }

  // Validate date range if provided
  if (updates.dateRange) {
    if (!updates.dateRange.startDate || !updates.dateRange.endDate) {
      return res.status(400).json({
        error: 'Invalid date range',
        message: 'Both start date and end date are required'
      });
    }
  }

  try {
    const updatedQuery = await weatherService.updateWeatherQuery(id, updates);
    
    if (!updatedQuery) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Weather query not found'
      });
    }

    // If location was updated, try to regenerate AI insight
    let aiInsight = null;
    if (updates.location) {
      try {
        // Get existing insight first
        const existingInsight = await weatherService.getAIInsight(id);
        if (existingInsight) {
          // Delete old insight and generate new one
          // Note: In a production app, you might want to update instead of delete/recreate
          aiInsight = await weatherService.generateAIInsight(id);
        }
      } catch (error) {
        console.warn('Failed to regenerate AI insight:', error);
      }
    } else {
      // Get existing insight if location wasn't changed
      try {
        aiInsight = await weatherService.getAIInsight(id);
      } catch (error) {
        console.warn('Failed to fetch AI insight:', error);
      }
    }

    res.status(200).json({
      query: updatedQuery,
      aiInsight
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

async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const deleted = await weatherService.deleteWeatherQuery(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Weather query not found'
      });
    }

    res.status(204).end(); // No content response for successful deletion
  } catch (error) {
    throw error;
  }
} 