import { WeatherQuery, AIInsight, ExportFormat, ExportData } from '../types/weather';
import * as Papa from 'papaparse';
import { js2xml } from 'js2xmlparser';
import jsPDF from 'jspdf';
import { format } from 'date-fns';

class ExportService {
  
  async exportWeatherData(
    queries: WeatherQuery[],
    insights: AIInsight[],
    exportFormat: ExportFormat
  ): Promise<{ data: string | Blob; filename: string; mimeType: string }> {
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    
    switch (exportFormat) {
      case 'json':
        return this.exportToJSON(queries, insights, timestamp);
      case 'csv':
        return this.exportToCSV(queries, insights, timestamp);
      case 'xml':
        return this.exportToXML(queries, insights, timestamp);
      case 'pdf':
        return await this.exportToPDF(queries, insights, timestamp);
      case 'markdown':
        return this.exportToMarkdown(queries, insights, timestamp);
      default:
        throw new Error(`Unsupported export format: ${exportFormat}`);
    }
  }

  private exportToJSON(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): { data: string; filename: string; mimeType: string } {
    const exportData: ExportData = {
      queries,
      insights,
      exportedAt: new Date(),
      format: 'json'
    };

    return {
      data: JSON.stringify(exportData, null, 2),
      filename: `skycast_weather_data_${timestamp}.json`,
      mimeType: 'application/json'
    };
  }

  private exportToCSV(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): { data: string; filename: string; mimeType: string } {
    // Flatten weather queries for CSV
    const flattenedQueries = queries.map(query => ({
      id: query._id,
      location: query.location,
      startDate: query.dateRange.startDate,
      endDate: query.dateRange.endDate,
      temperature: query.weatherData.temperature,
      description: query.weatherData.description,
      humidity: query.weatherData.humidity,
      windSpeed: query.weatherData.windSpeed,
      feelsLike: query.weatherData.feelsLike,
      pressure: query.weatherData.pressure,
      visibility: query.weatherData.visibility,
      createdAt: query.createdAt,
      userNotes: query.userNotes,
      tags: query.tags?.join(', ') || ''
    }));

    // Flatten AI insights for CSV
    const flattenedInsights = insights.map(insight => ({
      id: insight._id,
      queryId: insight.queryId,
      location: insight.location,
      insight: insight.insight,
      recommendations: insight.recommendations?.join(' | ') || '',
      weatherSummary: insight.weatherSummary,
      travelAdvice: insight.travelAdvice || '',
      clothingRecommendations: insight.clothingRecommendations?.join(' | ') || '',
      activitySuggestions: insight.activitySuggestions?.join(' | ') || '',
      generatedAt: insight.generatedAt,
      model: insight.model
    }));

    // Create CSV content
    const queriesCSV = Papa.unparse(flattenedQueries);
    const insightsCSV = Papa.unparse(flattenedInsights);
    
    const combinedCSV = `Weather Queries\n${queriesCSV}\n\nAI Insights\n${insightsCSV}`;

    return {
      data: combinedCSV,
      filename: `skycast_weather_data_${timestamp}.csv`,
      mimeType: 'text/csv'
    };
  }

  private exportToXML(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): { data: string; filename: string; mimeType: string } {
    const exportData = {
      '@': {
        exportedAt: new Date().toISOString(),
        format: 'xml',
        totalQueries: queries.length.toString(),
        totalInsights: insights.length.toString()
      },
      weatherQueries: {
        query: queries.map(query => ({
          '@': { id: query._id },
          location: query.location,
          dateRange: {
            startDate: query.dateRange.startDate,
            endDate: query.dateRange.endDate
          },
          weatherData: {
            temperature: query.weatherData.temperature.toString(),
            description: query.weatherData.description,
            humidity: query.weatherData.humidity.toString(),
            windSpeed: query.weatherData.windSpeed.toString(),
            feelsLike: query.weatherData.feelsLike.toString(),
            pressure: query.weatherData.pressure.toString(),
            visibility: query.weatherData.visibility.toString()
          },
          metadata: {
            createdAt: query.createdAt,
            userNotes: query.userNotes || '',
            tags: query.tags?.join(', ') || ''
          }
        }))
      },
      aiInsights: {
        insight: insights.map(insight => ({
          '@': { id: insight._id, queryId: insight.queryId },
          location: insight.location,
          insight: insight.insight,
          recommendations: insight.recommendations?.join(' | ') || '',
          weatherSummary: insight.weatherSummary,
          travelAdvice: insight.travelAdvice || '',
          clothingRecommendations: insight.clothingRecommendations?.join(' | ') || '',
          activitySuggestions: insight.activitySuggestions?.join(' | ') || '',
          metadata: {
            generatedAt: insight.generatedAt,
            model: insight.model
          }
        }))
      }
    };

    try {
      const xmlData = js2xml('skyCastExport', exportData, {
        compact: false,
        ignoreComment: true,
        spaces: 2
      });

      return {
        data: xmlData,
        filename: `skycast_weather_data_${timestamp}.xml`,
        mimeType: 'application/xml'
      };
    } catch (error) {
      console.error('XML export error:', error);
      
      // Fallback to simple XML generation if js2xmlparser fails
      const simpleXML = this.generateSimpleXML(queries, insights, timestamp);
      return {
        data: simpleXML,
        filename: `skycast_weather_data_${timestamp}.xml`,
        mimeType: 'application/xml'
      };
    }
  }

  private generateSimpleXML(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<skyCastExport exportedAt="${new Date().toISOString()}" format="xml" totalQueries="${queries.length}" totalInsights="${insights.length}">\n`;
    
    // Weather Queries
    xml += '  <weatherQueries>\n';
    queries.forEach(query => {
      xml += `    <query id="${query._id}">\n`;
      xml += `      <location>${this.escapeXML(query.location)}</location>\n`;
      xml += `      <dateRange>\n`;
      xml += `        <startDate>${query.dateRange.startDate}</startDate>\n`;
      xml += `        <endDate>${query.dateRange.endDate}</endDate>\n`;
      xml += `      </dateRange>\n`;
      xml += `      <weatherData>\n`;
      xml += `        <temperature>${query.weatherData.temperature}</temperature>\n`;
      xml += `        <description>${this.escapeXML(query.weatherData.description)}</description>\n`;
      xml += `        <humidity>${query.weatherData.humidity}</humidity>\n`;
      xml += `        <windSpeed>${query.weatherData.windSpeed}</windSpeed>\n`;
      xml += `        <feelsLike>${query.weatherData.feelsLike}</feelsLike>\n`;
      xml += `        <pressure>${query.weatherData.pressure}</pressure>\n`;
      xml += `        <visibility>${query.weatherData.visibility}</visibility>\n`;
      xml += `      </weatherData>\n`;
      xml += `      <metadata>\n`;
      xml += `        <createdAt>${query.createdAt}</createdAt>\n`;
      xml += `        <userNotes>${this.escapeXML(query.userNotes || '')}</userNotes>\n`;
      xml += `        <tags>${this.escapeXML(query.tags?.join(', ') || '')}</tags>\n`;
      xml += `      </metadata>\n`;
      xml += `    </query>\n`;
    });
    xml += '  </weatherQueries>\n';
    
    // AI Insights
    xml += '  <aiInsights>\n';
    insights.forEach(insight => {
      xml += `    <insight id="${insight._id}" queryId="${insight.queryId}">\n`;
      xml += `      <location>${this.escapeXML(insight.location)}</location>\n`;
      xml += `      <insight>${this.escapeXML(insight.insight)}</insight>\n`;
      xml += `      <recommendations>${this.escapeXML(insight.recommendations?.join(' | ') || '')}</recommendations>\n`;
      xml += `      <weatherSummary>${this.escapeXML(insight.weatherSummary)}</weatherSummary>\n`;
      xml += `      <travelAdvice>${this.escapeXML(insight.travelAdvice || '')}</travelAdvice>\n`;
      xml += `      <clothingRecommendations>${this.escapeXML(insight.clothingRecommendations?.join(' | ') || '')}</clothingRecommendations>\n`;
      xml += `      <activitySuggestions>${this.escapeXML(insight.activitySuggestions?.join(' | ') || '')}</activitySuggestions>\n`;
      xml += `      <metadata>\n`;
      xml += `        <generatedAt>${insight.generatedAt}</generatedAt>\n`;
      xml += `        <model>${this.escapeXML(insight.model)}</model>\n`;
      xml += `      </metadata>\n`;
      xml += `    </insight>\n`;
    });
    xml += '  </aiInsights>\n';
    
    xml += '</skyCastExport>\n';
    
    return xml;
  }

  private escapeXML(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async exportToPDF(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): Promise<{ data: Blob; filename: string; mimeType: string }> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(0, 100, 200);
    doc.text('SkyCast Weather Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Export info
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 20, currentY);
    currentY += 10;
    doc.text(`Total Queries: ${queries.length}`, 20, currentY);
    currentY += 10;
    doc.text(`AI Insights: ${insights.length}`, 20, currentY);
    currentY += 20;

    // Weather queries section
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Weather Queries', 20, currentY);
    currentY += 10;

    for (const query of queries.slice(0, 10)) { // Limit to prevent PDF from being too large
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 50, 100);
      doc.text(`Location: ${query.location}`, 20, currentY);
      currentY += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(`Date Range: ${query.dateRange.startDate} to ${query.dateRange.endDate}`, 25, currentY);
      currentY += 6;
      doc.text(`Temperature: ${query.weatherData.temperature}°C (feels like ${query.weatherData.feelsLike}°C)`, 25, currentY);
      currentY += 6;
      doc.text(`Conditions: ${query.weatherData.description}`, 25, currentY);
      currentY += 6;
      doc.text(`Humidity: ${query.weatherData.humidity}% | Wind: ${query.weatherData.windSpeed} km/h`, 25, currentY);
      currentY += 6;

      if (query.userNotes) {
        doc.text(`Notes: ${query.userNotes.substring(0, 100)}`, 25, currentY);
        currentY += 6;
      }

      currentY += 5; // Space between entries
    }

    // AI Insights section
    if (insights.length > 0) {
      currentY += 10;
      if (currentY > pageHeight - 100) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('AI Weather Insights', 20, currentY);
      currentY += 10;

      for (const insight of insights.slice(0, 5)) { // Limit insights
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 50, 100);
        doc.text(`Location: ${insight.location}`, 20, currentY);
        currentY += 8;

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        
        // Word wrap for insight text
        const insightLines = doc.splitTextToSize(insight.insight, pageWidth - 40);
        doc.text(insightLines, 25, currentY);
        currentY += insightLines.length * 5 + 5;

        if (insight.recommendations && insight.recommendations.length > 0) {
          doc.text('Recommendations:', 25, currentY);
          currentY += 5;
          insight.recommendations.slice(0, 3).forEach(rec => {
            const recLines = doc.splitTextToSize(`• ${rec}`, pageWidth - 50);
            doc.text(recLines, 30, currentY);
            currentY += recLines.length * 5;
          });
        }

        currentY += 5; // Space between insights
      }
    }

    const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });

    return {
      data: pdfBlob,
      filename: `skycast_weather_report_${timestamp}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  private exportToMarkdown(
    queries: WeatherQuery[],
    insights: AIInsight[],
    timestamp: string
  ): { data: string; filename: string; mimeType: string } {
    let markdown = `# SkyCast Weather Report\n\n`;
    markdown += `**Generated:** ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}\n`;
    markdown += `**Total Queries:** ${queries.length}\n`;
    markdown += `**AI Insights:** ${insights.length}\n\n`;

    // Weather Queries Section
    markdown += `## Weather Queries\n\n`;
    
    queries.forEach((query, index) => {
      markdown += `### ${index + 1}. ${query.location}\n\n`;
      markdown += `**Date Range:** ${query.dateRange.startDate} to ${query.dateRange.endDate}\n\n`;
      
      markdown += `**Current Weather:**\n`;
      markdown += `- 🌡️ Temperature: **${query.weatherData.temperature}°C** (feels like ${query.weatherData.feelsLike}°C)\n`;
      markdown += `- 🌤️ Conditions: ${query.weatherData.description}\n`;
      markdown += `- 💧 Humidity: ${query.weatherData.humidity}%\n`;
      markdown += `- 💨 Wind Speed: ${query.weatherData.windSpeed} km/h\n`;
      markdown += `- 👁️ Visibility: ${query.weatherData.visibility} km\n`;
      markdown += `- 📊 Pressure: ${query.weatherData.pressure} hPa\n\n`;
      
      if (query.userNotes) {
        markdown += `**Notes:** ${query.userNotes}\n\n`;
      }
      
      if (query.tags && query.tags.length > 0) {
        markdown += `**Tags:** ${query.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
      }
      
      markdown += `---\n\n`;
    });

    // AI Insights Section
    if (insights.length > 0) {
      markdown += `## AI Weather Insights\n\n`;
      
      insights.forEach((insight, index) => {
        markdown += `### ${index + 1}. ${insight.location} Analysis\n\n`;
        markdown += `${insight.insight}\n\n`;
        
        if (insight.recommendations && insight.recommendations.length > 0) {
          markdown += `**Recommendations:**\n`;
          insight.recommendations.forEach(rec => {
            markdown += `- ${rec}\n`;
          });
          markdown += `\n`;
        }
        
        if (insight.travelAdvice) {
          markdown += `**Travel Advice:** ${insight.travelAdvice}\n\n`;
        }
        
        if (insight.clothingRecommendations && insight.clothingRecommendations.length > 0) {
          markdown += `**Clothing Recommendations:**\n`;
          insight.clothingRecommendations.forEach(rec => {
            markdown += `- ${rec}\n`;
          });
          markdown += `\n`;
        }
        
        if (insight.activitySuggestions && insight.activitySuggestions.length > 0) {
          markdown += `**Activity Suggestions:**\n`;
          insight.activitySuggestions.forEach(activity => {
            markdown += `- ${activity}\n`;
          });
          markdown += `\n`;
        }
        
        markdown += `*Generated by: ${insight.model}*\n\n`;
        markdown += `---\n\n`;
      });
    }

    markdown += `\n---\n*Report generated by SkyCast Weather App*`;

    return {
      data: markdown,
      filename: `skycast_weather_report_${timestamp}.md`,
      mimeType: 'text/markdown'
    };
  }

  // Helper method to download files
  downloadFile(data: string | Blob, filename: string, mimeType: string): void {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService(); 