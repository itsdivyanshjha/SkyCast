import axios from 'axios';
import { WeatherData, ForecastData, AIInsight } from '../types/weather';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const MODEL = 'microsoft/wizardlm-2-8x22b'; // Fast and cost-effective model

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
}

class AIService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenRouter API key not configured. AI features will be disabled.');
    }
  }

  private async makeRequest(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await axios.post<OpenRouterResponse>(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `You are an expert meteorologist and travel advisor. Provide practical, concise weather insights and recommendations. 
              Keep responses under 200 words and focus on actionable advice. 
              Always maintain a friendly, professional tone.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            'X-Title': 'SkyCast Weather App'
          }
        }
      );

      return response.data.choices[0]?.message?.content || 'Unable to generate insight';
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error('Failed to generate AI insight');
    }
  }

  async generateWeatherInsight(
    location: string,
    weatherData: WeatherData,
    forecastData?: ForecastData
  ): Promise<Partial<AIInsight>> {
    try {
      const prompt = this.buildWeatherPrompt(location, weatherData, forecastData);
      const response = await this.makeRequest(prompt);
      
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('Error generating weather insight:', error);
      return {
        insight: 'Unable to generate AI insight at this time.',
        recommendations: ['Check weather conditions before heading out'],
        weatherSummary: `Current weather in ${location}: ${weatherData.temperature}°C, ${weatherData.description}`,
        model: MODEL
      };
    }
  }

  private buildWeatherPrompt(
    location: string,
    weather: WeatherData,
    forecast?: ForecastData
  ): string {
    let prompt = `Analyze the weather for ${location}:

CURRENT CONDITIONS:
- Temperature: ${weather.temperature}°C (feels like ${weather.feelsLike}°C)
- Conditions: ${weather.description}
- Humidity: ${weather.humidity}%
- Wind: ${weather.windSpeed} km/h
- Visibility: ${weather.visibility} km
- Pressure: ${weather.pressure} hPa`;

    if (forecast?.list?.length) {
      prompt += `\n\nUPCOMING FORECAST:`;
      forecast.list.slice(0, 3).forEach(day => {
        prompt += `\n- ${day.date}: ${day.temperature.min}-${day.temperature.max}°C, ${day.description}`;
      });
    }

    prompt += `\n\nProvide:
1. A brief weather summary (1-2 sentences)
2. 3-4 practical recommendations for activities/clothing
3. Travel advice if relevant
4. Any weather alerts or considerations

Format as JSON with keys: summary, recommendations, travelAdvice, clothingTips`;

    return prompt;
  }

  private parseAIResponse(response: string): Partial<AIInsight> {
    try {
      // Try to parse JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          insight: parsed.summary || response,
          recommendations: Array.isArray(parsed.recommendations) 
            ? parsed.recommendations 
            : [parsed.recommendations].filter(Boolean),
          weatherSummary: parsed.summary || '',
          travelAdvice: parsed.travelAdvice,
          clothingRecommendations: Array.isArray(parsed.clothingTips) 
            ? parsed.clothingTips 
            : [parsed.clothingTips].filter(Boolean),
          model: MODEL
        };
      }
    } catch (error) {
      // If JSON parsing fails, process as plain text
    }

    // Fallback to text parsing
    const lines = response.split('\n').filter(line => line.trim());
    const recommendations: string[] = [];
    let insight = '';
    let travelAdvice = '';

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (cleanLine.includes('recommend') || cleanLine.includes('suggest') || cleanLine.includes('should')) {
        recommendations.push(cleanLine.replace(/^[-•*]\s*/, ''));
      } else if (cleanLine.includes('travel') || cleanLine.includes('drive') || cleanLine.includes('transport')) {
        travelAdvice = cleanLine;
      } else if (cleanLine && !insight) {
        insight = cleanLine;
      }
    });

    return {
      insight: insight || response.slice(0, 150) + '...',
      recommendations: recommendations.length ? recommendations : ['Check current conditions before going out'],
      weatherSummary: insight,
      travelAdvice,
      model: MODEL
    };
  }

  async generateLocationContext(location: string): Promise<string> {
    try {
      const prompt = `Provide 2-3 interesting facts about ${location} related to its climate, geography, or notable weather patterns. Keep it under 100 words and focus on weather-relevant information.`;
      
      const response = await this.makeRequest(prompt);
      return response;
    } catch (error) {
      console.error('Error generating location context:', error);
      return `${location} is a location with varied weather patterns throughout the year.`;
    }
  }

  async generateActivitySuggestions(
    location: string,
    weather: WeatherData,
    dateRange: { startDate: string; endDate: string }
  ): Promise<string[]> {
    try {
      const prompt = `Based on the weather in ${location} (${weather.temperature}°C, ${weather.description}) during ${dateRange.startDate} to ${dateRange.endDate}, suggest 3-4 specific activities that would be ideal for these conditions. Be practical and location-appropriate.`;
      
      const response = await this.makeRequest(prompt);
      
      // Extract activities from response
      const activities = response
        .split('\n')
        .filter(line => line.trim() && (line.includes('-') || line.includes('•') || line.includes('*')))
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);

      return activities.length ? activities : [
        'Check local weather before outdoor activities',
        'Dress appropriately for current conditions',
        'Stay hydrated and sun-protected'
      ];
    } catch (error) {
      console.error('Error generating activity suggestions:', error);
      return ['Monitor weather conditions for outdoor activities'];
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

export const aiService = new AIService(); 