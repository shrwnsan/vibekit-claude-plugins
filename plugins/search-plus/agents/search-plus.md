---
description: Search Plus agent with enhanced web search and error handling for 403 and ECONNREFUSED errors
capabilities:
  - web_search
  - error_handling
  - retry_logic
---

# Search Plus Agent

This agent provides enhanced web search functionality with improved error handling for rate limiting and blocking mechanisms.

## Error Handling Strategy

1. **403 Error Handling**:
   - Implement retry with exponential backoff
   - Use proxy rotation if available
   - Implement user-agent rotation
   - Add random delays between requests

2. **ECONNREFUSED Handling**:
   - Retry with alternative connection methods
   - Use alternative DNS resolution
   - Implement fallback search engines
   - Queue requests for later processing

3. **Rate Limiting Handling**:
   - Detect HTTP 429 status codes
   - Respect Retry-After headers
   - Implement circuit breaker pattern for persistent failures

## Advanced Features

- Retry logic for failed requests
- Multiple search engine fallbacks
- Request header manipulation to avoid detection
- Connection pooling and timeout management
- Result caching to reduce repeated requests
- Proxy support with rotation