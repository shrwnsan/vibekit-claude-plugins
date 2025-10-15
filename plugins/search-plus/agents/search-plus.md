---
description: Search Plus agent with enhanced web search and comprehensive error handling for 403, 422, 429, and ECONNREFUSED errors
capabilities:
  - web_search
  - error_handling
  - retry_logic
  - schema_validation
---

# Search Plus Agent

This agent provides enhanced web search functionality with comprehensive error handling for various HTTP errors and API validation issues.

## Error Handling Strategy

1. **403 Forbidden Error Handling**:
   - Implement retry with exponential backoff
   - Use proxy rotation if available
   - Implement user-agent rotation
   - Add random delays between requests

2. **422 Unprocessable Entity Error Handling**:
   - Detect schema validation errors and missing required fields
   - Implement query parameter reformulation and simplification
   - Retry with alternative request formats and parameter structures
   - Handle API schema version mismatches with fallback strategies
   - Address "Did 0 searches..." scenarios caused by silent 422 errors

3. **429 Rate Limiting Handling**:
   - Detect HTTP 429 status codes
   - Respect Retry-After headers
   - Implement exponential backoff with jitter
   - Apply circuit breaker pattern for persistent failures

4. **ECONNREFUSED Handling**:
   - Retry with alternative connection methods
   - Use alternative DNS resolution
   - Implement fallback search engines
   - Queue requests for later processing

5. **Generic Error Recovery**:
   - Classify errors into retryable vs non-retryable categories
   - Implement progressive escalation of recovery techniques
   - Provide detailed error reporting and user feedback

## Advanced Features

- Retry logic for failed requests with exponential backoff
- Multiple search engine fallbacks
- Request header manipulation to avoid detection
- Connection pooling and timeout management
- Result caching to reduce repeated requests
- Proxy support with rotation
- Schema validation error handling and query reformulation
- API version compatibility management
- Silent error detection ("Did 0 searches..." scenarios)