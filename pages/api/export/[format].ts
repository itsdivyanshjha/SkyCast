import { NextApiRequest, NextApiResponse } from 'next';
import { weatherService } from '../../../lib/weatherService';
import { exportService } from '../../../lib/exportService';
import { ExportFormat, WeatherQueryFilters } from '../../../types/weather';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { format } = req.query;

  if (!format || typeof format !== 'string') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'Export format is required'
    });
  }

  const validFormats: ExportFormat[] = ['json', 'csv', 'xml', 'pdf', 'markdown'];
  if (!validFormats.includes(format as ExportFormat)) {
    return res.status(400).json({
      error: 'Invalid format',
      message: `Supported formats: ${validFormats.join(', ')}`
    });
  }

  try {
    // Parse query filters (similar to weather-queries API)
    const { 
      location, 
      dateFrom, 
      dateTo, 
      tags, 
      hasAIInsight,
      limit = '100' // Default higher limit for exports
    } = req.query;

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

    const limitNum = Math.min(parseInt(limit as string, 10) || 100, 1000); // Max 1000 for exports

    // Fetch weather queries
    const weatherQueriesResult = await weatherService.listWeatherQueries(filters, 1, limitNum);
    const weatherQueries = weatherQueriesResult.data;

    // Fetch AI insights for all queries
    const aiInsights = [];
    for (const query of weatherQueries) {
      try {
        const insight = await weatherService.getAIInsight(query._id!);
        if (insight) {
          aiInsights.push(insight);
        }
      } catch (error) {
        console.warn(`Failed to fetch AI insight for query ${query._id}:`, error);
      }
    }

    // Generate export
    const exportResult = await exportService.exportWeatherData(
      weatherQueries,
      aiInsights,
      format as ExportFormat
    );

    // Set appropriate headers based on format
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.setHeader('Content-Type', exportResult.mimeType);

    // Handle different data types
    if (exportResult.data instanceof Blob) {
      // For PDF (Blob)
      const buffer = Buffer.from(await exportResult.data.arrayBuffer());
      res.status(200).send(buffer);
    } else {
      // For text-based formats (string)
      res.status(200).send(exportResult.data);
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Export failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 