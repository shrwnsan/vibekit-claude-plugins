// hooks/tavily-client.mjs
import { setTimeout } from 'timers/promises';

// Tavily API configuration - in a real implementation, this would come from environment/config
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || 'YOUR_TAVILY_API_KEY_HERE';
const TAVILY_SEARCH_URL = 'https://api.tavily.com/search';
const TAVILY_EXTRACT_URL = 'https://api.tavily.com/extract';

/**
 * Performs a search using the Tavily API with enhanced error handling
 * @param {Object} params - Search parameters
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Object} Search results
 */
export async function tavilySearch(params, timeoutMs = 15000) {
  // Construct the request payload
  const requestBody = {
    api_key: TAVILY_API_KEY,
    query: params.query,
    max_results: params.maxResults || 5,
    include_answer: params.includeAnswer !== false, // Default to true
    include_raw_content: params.includeRawContent || false,
    num_days: params.numDays || 30, // Look back 30 days by default
  };

  // Add headers if provided
  const headers = {
    'Content-Type': 'application/json',
    ...params.headers
  };

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(timeoutMs, null).then(() => {
      controller.abort();
    });

    // Make the API request
    const response = await fetch(TAVILY_SEARCH_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    // Clear the timeout if the request completes in time
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused when trying to reach Tavily API: ${error.message}`);
    } else {
      throw error;
    }
  }
}

/**
 * Extracts content from a specific URL using Tavily's Extract API
 * @param {string} url - The URL to extract content from
 * @param {Object} options - Extraction options
 * @param {number} timeoutMs - Request timeout in milliseconds
 * @returns {Object} Extracted content
 */
export async function tavilyExtract(url, options = {}, timeoutMs = 15000) {
  // Validate URL
  if (!url || typeof url !== 'string') {
    throw new Error('Valid URL is required for content extraction');
  }

  // Construct the request payload
  const requestBody = {
    api_key: TAVILY_API_KEY,
    urls: [url.trim()]
  };

  // Add optional parameters
  if (options.includeImages) requestBody.include_images = options.includeImages;
  if (options.extractDepth) requestBody.extract_depth = options.extractDepth;

  // Add headers if provided
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(timeoutMs, null).then(() => {
      controller.abort();
    });

    // Make the API request
    const response = await fetch(TAVILY_EXTRACT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    // Clear the timeout if the request completes in time
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Tavily Extract API error: ${response.status} - ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    // Format the response to match search results structure
    return {
      results: [{
        title: data.title || `Content from ${url}`,
        url: url,
        content: data.raw_content || data.content || '',
        score: 1.0,
        extracted_content: true
      }],
      answer: data.summary || null,
      query: url,
      response_time: data.response_time || 0
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Extraction request timeout after ${timeoutMs}ms`);
    } else if (error.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused when trying to reach Tavily Extract API: ${error.message}`);
    } else {
      throw error;
    }
  }
}

export default { tavilySearch, tavilyExtract };