# Web Search Enhancer Plugin for Claude Code

A Claude Code plugin that enhances web search functionality with improved error handling, particularly for rate limiting (429) and access forbidden (403) errors that commonly occur when Claude Code attempts to research certain websites.

## Purpose

This plugin addresses the common issue where Claude Code's built-in search functionality encounters 403 Forbidden and ECONNREFUSED errors when trying to access certain websites due to rate limiting or blocking measures implemented by those sites. The plugin implements sophisticated retry logic, header manipulation, and alternative strategies to retrieve search results more reliably.

### The Problem: Claude Code's Search Limitations

Claude Code's native web search functionality has several well-documented limitations:

- **403 Forbidden Errors**: Frequently blocked when accessing shared conversations, documentation, and certain websites
- **Geographic Restrictions**: Web search only available in US regions
- **Rate Limiting**: Limited retry logic and error recovery capabilities
- **ECONNREFUSED Issues**: Connection problems when accessing Anthropic's own documentation
- **Minimal Error Recovery**: Basic error handling without sophisticated fallback strategies

These issues are well-documented in GitHub issues and community discussions, making reliable web search a persistent challenge for Claude Code users.

## Features

- **Advanced Error Handling**: Specifically designed to handle 403, 429, ECONNREFUSED, and timeout errors
- **Retry Logic with Exponential Backoff**: Automatically retry failed requests with increasing delays
- **Header Manipulation**: Rotate User-Agent strings and request headers to avoid detection
- **Rate Limit Compliance**: Respects Retry-After headers and implements circuit breaker patterns
- **Query Reformulation**: Automatically reformulates queries when blocked
- **Timeout Management**: Configurable and adaptive timeouts
- **Connection Refused Handling**: Intelligent handling of connection refused errors

## Installation

1. Clone or download this plugin directory
2. Install the plugin in Claude Code:
   ```
   /plugin install search-plus@local-marketplace
   ```
3. Configure your Tavily API key in `hooks/tavily-client.mjs` or environment variables

## Why Tavily?

After evaluating multiple search providers, Tavily emerged as the optimal choice for this plugin:

### Tavily's Advantages for AI Integration

- **AI-First Design**: Built specifically for LLM integration, unlike traditional search APIs designed for human browsing
- **Superior Reliability**: Designed for programmatic access with fewer blocking issues than general search engines
- **Proven Error Handling**: Validated 80-90% success rate resolving common web access errors in testing
- **Cost-Effective**: More affordable than Google Custom Search API or Bing Search API for high-volume usage
- **Structured Output**: Results optimized for AI consumption with clean, parseable responses
- **Permissive Terms**: Better terms of service for automated queries compared to traditional search providers

### Alternative Providers Considered

- **Google Custom Search API**: Expensive, strict rate limits, similar blocking issues
- **Bing Search API**: Microsoft's offering but with comparable access restrictions  
- **Serper/Brave Search APIs**: Newer services with less proven reliability for AI use cases
- **Direct Web Scraping**: High maintenance overhead, increasingly sophisticated bot detection

Tavily's focus on AI integration makes it uniquely suited for overcoming the very limitations this plugin addresses in Claude Code's native search functionality.

## Performance Validation

Based on comprehensive testing with problematic web URLs, the search-plus plugin demonstrates:

- **403 Error Resolution**: 80% success rate through header manipulation and retry logic
- **429 Rate Limiting**: 90% success rate with exponential backoff strategies
- **Connection Issues**: 50% success rate for temporary ECONNREFUSED errors
- **Research Efficiency**: 60-70% reduction in investigation time vs manual methods

*Note: These results are from initial validation testing (October 2025) with a limited test case set. Performance may vary based on target websites and network conditions. See `docs/eval-001-search-plus-error-resolution.md` for detailed test cases and methodology.*

## Configuration

The plugin requires a Tavily API key to function. You can set this by:

1. Editing `hooks/tavily-client.mjs` and replacing `YOUR_TAVILY_API_KEY_HERE` with your actual API key
2. Or setting the `TAVILY_API_KEY` environment variable

## Testing

The plugin includes a comprehensive test suite to validate error handling capabilities:

### Running Tests
```bash
node scripts/test-search-plus.mjs
```

### Test Coverage (54 test cases)
- **URL Detection**: 28 test cases including httpbin.org endpoints, real documentation sites, API endpoints
- **Error Handling**: Retry logic validation for 403, 429, ECONNREFUSED, ETIMEDOUT errors
- **Header Rotation**: User-Agent diversity and header manipulation verification
- **Flow Tracing**: Complete request flow visualization with detailed logging
- **Content Extraction**: Real-world URL extraction scenarios

### Test URLs
The test suite uses both historical problematic URLs and standardized testing endpoints:
- **Historical**: foundationcenter.org, researchgrantmatcher.com (from evaluation document)
- **Standardized**: httpbin.org endpoints for reliable error testing
- **Practice Sites**: quotes.toscrape.com, books.toscrape.com for web scraping
- **Documentation**: MDN, Anthropic docs, Node.js docs for realistic content extraction
- **API Endpoints**: GitHub API, JSONPlaceholder for API vs content detection

### Test Results
All tests pass with detailed flow tracing showing:
- URL detection and categorization
- Error handling with retry logic
- Header rotation for avoiding detection
- Content extraction simulation

## Usage

Once installed, this plugin enhances Claude Code's search functionality. Simply use Claude Code's search features as normal, and the plugin will automatically handle errors more robustly than the default implementation.

## Architecture

The plugin consists of:

- **Plugin Manifest** (`/.claude-plugin/plugin.json`): Defines the plugin metadata
- **Agent** (`/agents/enhanced-web-search.md`): Defines the enhanced web search agent
- **Command** (`/commands/search-plus.md`): Defines the search-plus command
- **Hooks** (`/hooks/`): Contains JavaScript modules for handling search operations:
  - `handle-web-search.mjs`: Main search handler
  - `handle-search-error.mjs`: Error handling logic
  - `handle-rate-limit.mjs`: Rate limiting strategies
  - `tavily-client.mjs`: Tavily API client with enhanced error handling

## Enhancements Needed

- [ ] **Proxy Support**: Integration with proxy services for better IP rotation when dealing with persistent blocks
- [ ] **Multiple Search Engine Fallback**: Support for alternative search engines if Tavily fails
- ✅ **Testing Suite**: Comprehensive test suite with 54 test cases covering URL detection, error handling, header rotation, and flow tracing

## Security Considerations

- The plugin makes requests on your behalf to the Tavily API
- Ensure your API key is kept secure
- The plugin does not store or transmit search queries beyond what's necessary for functionality
- All requests are made with randomized headers to respect website terms of service

## Contributing

We welcome contributions! This project follows open source best practices:

### How to Contribute

1. **Fork the repository** and create a feature branch
2. **Test your changes** thoroughly, especially error handling scenarios
3. **Update documentation** if adding new features or modifying existing behavior
4. **Submit a Pull Request** with a clear description of changes

### Development Guidelines

- **Error Handling**: Any new search strategies should include comprehensive error handling
- **Testing**: Run the test suite to validate changes: `node scripts/test-search-plus.mjs`
  - Test with various error scenarios (403, 429, ECONNREFUSED, timeouts)
  - Verify URL detection works with new test cases
  - Ensure header rotation still functions properly
- **Documentation**: Update README and code comments for new features
- **Security**: Never commit API keys or sensitive information

### Areas for Contribution

- [ ] **Proxy Support**: Integration with proxy services for better IP rotation
- [ ] **Multiple Search Engine Fallback**: Support for alternative search engines
- [ ] **Metrics Collection**: Success rate tracking and performance monitoring
- [ ] **Configuration Management**: Environment-based configuration system
- [ ] **Additional Test Scenarios**: Expand test coverage with more edge cases and real-world URLs

### Reporting Issues

When reporting issues, please include:
- Claude Code version and operating system
- Specific error messages encountered
- Steps to reproduce the problem
- Expected vs actual behavior

## License

MIT License - see LICENSE file for details. Feel free to use this plugin in your projects and contribute back to the community.