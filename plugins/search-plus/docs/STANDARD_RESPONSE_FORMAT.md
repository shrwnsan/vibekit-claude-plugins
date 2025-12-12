# Standard Response Format Documentation

## Overview

This document describes the standardized response format implemented across all search services in the search-plus plugin. The standardization ensures consistent data structure, scoring algorithms, and field availability across all providers.

## Benefits

1. **🎯 Consistent User Experience**: Uniform result quality across all services
2. **🔧 Simplified Integration**: Single response format for consumers
3. **📊 Better Analytics**: Consistent metrics and scoring across providers
4. **🚀 Future-Proof**: Easy addition of new search services
5. **🧪 Improved Testing**: Standardized test expectations
6. **📈 Enhanced Quality**: Advanced scoring and relevance algorithms

## Standard Response Schema

### Top-Level Structure

```javascript
{
  results: SearchResult[],
  answer: string | null,
  query: string,
  response_time: number,
  service: string,
  success_rate: number,
  metadata: ResponseMetadata
}
```

### SearchResult Structure

```javascript
{
  title: string,
  url: string,
  content: string,
  score: number,           // Normalized 0.0-1.0
  published_date: string | null,  // ISO format
  source: string,
  relevance_score: number  // Advanced relevance 0.0-1.0
}
```

### ResponseMetadata Structure

```javascript
{
  total_results: number,
  query_processed_at: string,      // ISO timestamp
  service_info: ServiceInfo
}
```

### ServiceInfo Structure (Service-Specific)

```javascript
// Tavily
{
  api_version: string,
  original_score_count: number,
  has_answer: boolean
}

// SearXNG
{
  number_of_engines: number,
  search_time: number,
  has_answers: boolean
}

// DuckDuckGo/Startpage (HTML parsing)
{
  parsed_html: boolean,
  extraction_successful: boolean
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | `SearchResult[]` | Array of search results |
| `query` | `string` | Original search query |
| `response_time` | `number` | Response time in milliseconds |
| `service` | `string` | Search service identifier |
| `success_rate` | `number` | Success rate 0.0-1.0 |
| `metadata` | `object` | Response metadata |

### SearchResult Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Result title |
| `url` | `string` | Result URL (must be valid) |
| `content` | `string` | Content/snippet |
| `score` | `number` | Normalized score 0.0-1.0 |
| `published_date` | `string\|null` | Publication date (ISO format) |
| `source` | `string` | Source service name |
| `relevance_score` | `number` | Advanced relevance 0.0-1.0 |

## Score Normalization

### Basic Score (0.0-1.0)
- **Linear**: Simple normalization preserving original ratios
- **Logarithmic**: Logarithmic scaling for better distribution
- **Exponential**: Exponential scaling emphasizing differences
- **Position-based**: Fallback using result position

### Relevance Score Algorithm

The relevance score considers multiple factors:

```javascript
relevance_score = base_score +
                 (title_matches * 0.3) +        // Title matching (30%)
                 (content_matches * 0.2) +      // Content matching (20%)
                 (position_score * 0.2) +       // Position bonus (20%)
                 (service_bonus * 0.1)          // Service reliability (10%)
```

#### Service Reliability Bonuses
- Tavily: +0.10
- SearXNG: +0.05
- DuckDuckGo: +0.03
- Startpage: +0.03

## Service Transformations

### Tavily API
```javascript
// Input
{
  results: [{ title, url, content, score, published_date }],
  answer: string
}

// Transformation
- Preserve original scores
- Add relevance scoring
- Extract service metadata
```

### SearXNG Metasearch
```javascript
// Input
{
  results: [{ title, url, content, publishedDate }],
  answers: [string],
  number_of_results: number
}

// Transformation
- Convert publishedDate to ISO format
- Apply logarithmic score normalization
- Extract first answer if available
```

### DuckDuckGo HTML
```javascript
// Input (Parsed HTML)
{
  results: [{ title, url, content }]
}

// Transformation
- Position-based scoring (1.0 - index * 0.1)
- No published dates available
- No instant answers in HTML mode
```

### Startpage HTML
```javascript
// Input (Parsed HTML)
{
  results: [{ title, url, content }]
}

// Transformation
- Same as DuckDuckGo
- Position-based scoring
```

## Usage Examples

### Basic Transformation
```javascript
import { transformToStandard } from './utils/response-transformer.mjs';

const standardResponse = transformToStandard('tavily', rawResponse, query, responseTime);
```

### Validation
```javascript
import { validateResponse } from './utils/response-validator.mjs';

const validation = validateResponse(response, { strict: true });
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}
```

### Batch Processing
```javascript
import { batchTransform } from './utils/response-transformer.mjs';

const responses = [
  { serviceName: 'tavily', response: tavilyData, query, responseTime },
  { serviceName: 'searxng', response: searxngData, query, responseTime }
];

const standardResponses = batchTransform(responses);
```

## Error Handling

### Standard Error Response
```javascript
{
  results: [],
  answer: null,
  query: string,
  response_time: number,
  service: string,
  success_rate: 0.0,
  metadata: {
    total_results: 0,
    query_processed_at: string,
    service_info: {
      error: true,
      error_message: string,
      error_code: string
    }
  }
}
```

## Validation Rules

### Strict Validation
- All required fields must be present
- Scores must be within 0.0-1.0 range
- URLs must be valid
- Numbers must be actual numbers

### Warnings (Non-Strict)
- Empty content fields
- Missing optional metadata
- Large score/relevance discrepancies
- Response time not provided

## Testing

### Run Tests
```bash
cd plugins/search-plus
node tests/test-standardization.mjs
```

### Test Coverage
- Service transformer registration
- Response transformation correctness
- Score normalization algorithms
- Validation accuracy
- Error handling
- Performance analysis
- Batch processing

## Performance Considerations

### Response Time Tracking
- Accurate timing using `Date.now()`
- Includes network request and processing time
- Excluded from transformation overhead

### Memory Efficiency
- Streaming transformation for large result sets
- Minimal object copying
- Efficient score calculations

### Caching
- Service transformers cached in Map
- Validation rules compiled once
- Metadata extraction optimized

## Migration Guide

### For Consumers
1. Update response handling to use new schema
2. Remove service-specific parsing logic
3. Add validation for standardized format
4. Update error handling

### For Service Developers
1. Create transformer in `utils/response-transformer.mjs`
2. Register transformer using `registerServiceTransformer()`
3. Implement validation function
4. Add tests in `tests/test-standardization.mjs`

## Future Enhancements

### Planned Features
1. **Advanced Relevance**: ML-based relevance scoring
2. **Result Deduplication**: Cross-service duplicate detection
3. **Quality Scoring**: Content quality assessment
4. **Caching**: Intelligent response caching
5. **Metrics**: Detailed performance and quality metrics

### Extension Points
1. **Custom Scoring**: Plug-in scoring algorithms
2. **Result Filtering**: Post-transformation filters
3. **Metadata Enrichment**: Additional metadata sources
4. **Validation Rules**: Custom validation rules

## Support

For questions or issues related to the standardized response format:

1. Check test files for usage examples
2. Review validation documentation
3. Examine transformer implementations
4. Run tests to verify behavior