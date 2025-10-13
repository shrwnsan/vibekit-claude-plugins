---
description: Enhanced web search with error handling for rate limiting and blocking
usage: /search-plus <query|url>
parameters:
  - name: query
    type: string
    required: true
    description: The search query to execute or URL to extract content from
---

# Enhanced Web Search Command

Implements robust web search functionality that handles various blocking mechanisms and URL content extraction:

## Features

- Advanced retry logic for failed requests
- Multiple search engine integration
- Request header manipulation to avoid detection
- Connection pooling and timeout management
- Result caching to reduce repeated requests
- Proxy support with rotation
- Rate limiting compliance
- **URL Content Extraction**: Direct content extraction from URLs and permalinks

## Usage

### Web Search
```bash
/search-plus "Claude Code plugin documentation"
/search-plus "best practices for API rate limiting"
```

### URL Content Extraction
```bash
/search-plus "https://docs.anthropic.com/en/docs/claude-code/plugins"
/search-plus "https://github.com/example/repo"
/search-plus "https://example.com/article"
```

## Error Handling

- Automatic retry for 403 Forbidden errors
- Connection refused error handling
- Timeout management with configurable limits
- Fallback to alternative search engines when primary fails
- URL extraction error recovery with retry logic

## Implementation

This command enhances Claude Code's existing search functionality by adding layers of error handling specifically designed to work around rate limiting and blocking mechanisms that cause 403 and ECONNREFUSED errors.

The process follows this flow:
1. **Input Detection**: Determine if input is a search query or URL
2. **For URLs**: Extract content directly using Tavily Extract API with retry logic
3. **For Queries**: Perform web search with enhanced error handling
4. **Error Recovery**: If errors detected (403, 429, ECONNREFUSED):
   - Adjust request parameters (headers, delays, etc.)
   - Retry with modified parameters
   - If retry fails, try alternative search method
5. **Return Results**: Formatted results with extraction metadata when applicable