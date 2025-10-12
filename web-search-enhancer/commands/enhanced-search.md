---
description: Enhanced web search with error handling for rate limiting and blocking
usage: /enhanced-search <query>
parameters:
  - name: query
    type: string
    required: true
    description: The search query to execute
---

# Enhanced Web Search Command

Implements robust web search functionality that handles various blocking mechanisms:

## Features

- Advanced retry logic for failed requests
- Multiple search engine integration
- Request header manipulation to avoid detection
- Connection pooling and timeout management
- Result caching to reduce repeated requests
- Proxy support with rotation
- Rate limiting compliance

## Error Handling

- Automatic retry for 403 Forbidden errors
- Connection refused error handling
- Timeout management with configurable limits
- Fallback to alternative search engines when primary fails

## Implementation

This command enhances Claude Code's existing search functionality by adding layers of error handling specifically designed to work around rate limiting and blocking mechanisms that cause 403 and ECONNREFUSED errors.

The search process follows this flow:
1. Submit search query with standard parameters
2. If successful, return results
3. If error detected (403, 429, ECONNREFUSED):
   - Adjust request parameters (headers, delays, etc.)
   - Retry with modified parameters
   - If retry fails, try alternative search method
4. Return results or error information