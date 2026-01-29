# Skill Invocation A/B Testing Framework

## Overview

This evaluation document outlines the A/B testing framework designed to compare different SKILL.md configurations and measure their effectiveness in automatic skill invocation by Claude Code.

## Current Status: Version B vs Version A Comparison

Based on git diff analysis (`HEAD~1..HEAD`), we have two SKILL.md versions to evaluate:

### Version A - "Enhanced Searching" (Previous)
```yaml
name: Enhanced Searching
description: Enhanced web searching capability that handles 403/429/422 errors...
```

**Key Characteristics:**
- Technical, feature-focused description
- Specific success rate claims (80-90%, "zero silent failures")
- Direct error recovery emphasis
- Performance metrics in documentation

### Version B - "meta-searching" (Current)
```yaml
name: meta-searching
description: Extracts web content and performs reliable searches when standard tools fail...
```

**Key Characteristics:**
- Educational, scenario-based description
- "When to Use" section for better automatic invocation
- Federated search approach (Tavily + Jina.ai)
- Honest about limitations (2-3x slower)

## Testing Methodology

### Test Objectives

1. **Automatic Invocation Rate**: Measure how often Claude Code automatically invokes each skill version
2. **Invocation Accuracy**: Correct invocation vs. false positives/negatives
3. **Response Quality**: Estimated effectiveness based on skill characteristics
4. **User Experience**: Overall success rate and satisfaction metrics

### Test Scenarios

8 scenarios across 3 difficulty levels:

#### High Difficulty (Should trigger skill)
- Documentation site access errors (403, domain restrictions)
- Complex error recovery (422 validation errors)
- Rate limiting issues (429 errors)

#### Medium Difficulty (Should trigger skill)
- Framework documentation research
- GitHub repository analysis
- Technical documentation extraction

#### Low Difficulty (Should NOT trigger skill)
- General web search queries
- Simple information requests

## Test Framework Implementation

### Location: `scripts/skill-ab-test.mjs`

**Key Features:**
- Automated version swapping (backup → test A → test B → restore)
- Simulated Claude Code invocation scoring
- Comparative analysis with winner determination
- Results saved to `test-results/skill-ab-test-{timestamp}.json`

### Usage

```bash
# Run A/B test
node scripts/skill-ab-test.mjs

# Monitor results
tail -f test-results/skill-ab-test-*.log
```

## Expected Results Analysis

### Key Metrics to Monitor

1. **Invocation Score** (0-100%): Algorithm-calculated likelihood of automatic invocation
2. **Invocation Accuracy**: Percentage of correct skill invocations
3. **Response Quality**: Estimated effectiveness score
4. **Success Rate**: Overall test scenario completion rate

### Hypothesis

**Version B should outperform Version A because:**
- Clearer "When to Use" section improves automatic detection
- More specific error code mentions (403, 429, 422)
- Educational tone helps Claude understand context better
- Structured scenarios provide clearer invocation triggers

## Current Performance Baseline

From latest `test-search-plus.mjs` results (2025-10-24T15:05:33.535Z):
- **Plugin Status**: FULLY_OPERATIONAL
- **Test Success Rate**: 100% (20/20 scenarios)
- **Average Response Time**: 4076ms
- **Error Handling**: All expected errors properly resolved

## Manual Validation Protocol

### Real-World Test Cases

1. **Test Case 1 - Real 403 Error**
   ```
   Prompt: "I need to extract content from https://httpbin.org/status/403 but getting 403 errors"
   Expected: Automatic skill invocation with meta-searching
   ```

2. **Test Case 2 - Real 429 Rate Limiting**
   ```
   Prompt: "I keep getting 429 rate limited errors when searching for web development tutorials, can you use enhanced search to bypass this?"
   Expected: Automatic skill invocation with meta-searching
   ```

3. **Test Case 3 - General Search (Control)**
   ```
   Prompt: "What are React best practices?"
   Expected: Standard web search (no skill invocation)
   ```

### **URL Updates - 2025-10-26**

**Previous URLs (DEPRECATED):**
- `https://docs.claude.com` - Actually accessible (200 OK)
- `https://react.dev` - Actually accessible (200 OK)

**Updated URLs (RECOMMENDED):**
- `https://httpbin.org/status/403` - Guaranteed 403 responses
- `https://httpbin.org/status/429` - Guaranteed 429 responses

**Reason for Change:**
Original URLs were accessible, causing Claude to correctly NOT invoke the skill. httpbin provides reliable, consistent error responses for proper skill invocation testing.

### Validation Steps

1. Test each prompt in Claude Code
2. Observe if skill automatically invokes
3. Rate response quality (1-5 scale)
4. Document any unexpected behavior
5. Compare with framework predictions

## Success Criteria

### Quantitative Benchmarks
- **Invocation Accuracy**: ≥80% for expected scenarios
- **False Positive Rate**: ≤20% for unexpected scenarios
- **Response Quality**: ≥75% average quality score
- **Performance**: ≤5000ms average response time

### Qualitative Benchmarks
- Clear automatic invocation for relevant scenarios
- No invocation for general queries
- High-quality, contextually appropriate responses
- Smooth user experience without confusion

## Next Steps

1. **Execute Framework**: Run `node scripts/skill-ab-test.mjs`
2. **Manual Validation**: Test real-world scenarios in Claude Code
3. **Analysis**: Review results and identify winning version
4. **Documentation**: Update based on findings
5. **Monitoring**: Track real-world usage patterns

## Troubleshooting Guide

### Common Issues

**Skill Not Invoking Automatically:**
- Check description clarity and error code inclusion
- Verify "when to use" scenarios are explicit
- Test with different prompt variations

**Too Many False Positives:**
- Make skill description more specific
- Add "try standard tools first" guidance
- Reduce broad keywords in description

**Performance Degradation:**
- Monitor response times in test results
- Check if skill is too ambitious in scope
- Verify service integration efficiency

## Recommendations

Based on the analysis, Version B (meta-searching) appears to have better structure for automatic invocation due to:

1. **Clear Trigger Language**: "Use when you encounter..." section
2. **Specific Error Codes**: Explicit mention of 403/429/422
3. **Educational Tone**: Helps Claude understand when to apply
4. **Realistic Expectations**: Honest about limitations builds trust

## File References

- **Test Framework**: `scripts/skill-ab-test.mjs`
- **Current Skill**: `plugins/search-plus/skills/search-plus/SKILL.md`
- **Test Results**: `test-results/skill-ab-test-{timestamp}.json`
- **Baseline Tests**: `test-results/enhanced-2025-10-24T15-05-33-535Z.json`

---

*Evaluation completed: 2025-10-24*
*Framework version: 1.0.0*
*Test scope: SKILL.md automatic invocation optimization*