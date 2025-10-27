# Search Plus Agent A/B Testing Framework

## Overview

This evaluation outlines the A/B testing framework designed to compare the **updated search-plus agent** against the **previous version** to measure improvements in reliability, performance, and user experience.

## Current Status: Agent Comparison Ready

Based on git diff analysis (`8ba7549..HEAD`), we have two agent versions to evaluate:

**Note**: Current agent (Version B) is deployed and ready for immediate testing. Baseline testing with Version A can be performed by reverting to commit `8ba7549` if comparative analysis is desired.

### Version A - Previous Agent (8ba7549)
**Key Characteristics:**
- Error-focused description with specific HTTP error handling
- Emphasis on 403/422/429 error recovery strategies
- Generic problem-solving approach
- Basic when-to-use guidance
- Limited structured output definition

### Version B - Updated Agent (Current)
**Key Characteristics:**
- Comprehensive runbook-based operating procedure
- Structured input/output specifications
- Decision heuristics and domain-specific optimization
- Enhanced fallback sequences with retry caps
- Detailed validation and deduplication processes
- Comprehensive error handling policy
- Do/Don't guidelines and examples

## Testing Methodology

### Test Objectives

1. **Reliability Improvement**: Measure success rates across problematic domains
2. **Performance Enhancement**: Compare response times and token efficiency
3. **Output Quality**: Evaluate structured response completeness and accuracy
4. **Error Recovery**: Test fallback sequence effectiveness
5. **User Experience**: Assess result clarity and actionability

### Test Scenarios

**8 test categories across 3 difficulty levels:**

#### High Difficulty (Complex Recovery Scenarios)
- **Reddit Extraction**: `https://reddit.com/r/programming/comments/abc123/best_practices`
- **Financial Sites**: `https://finance.yahoo.com/news/tech-companies-earnings`
- **API Documentation**: `https://docs.example.com/api/v2/endpoints`
- **Rate Limited Domains**: Known 429-responding services

#### Medium Difficulty (Standard Problematic Domains)
- **Documentation Sites**: `https://docs.example.com/getting-started`
- **News Articles**: `https://news.example.com/tech-trends`
- **Forum Content**: `https://forum.example.com/discussions`
- **GitHub Raw Files**: `https://raw.githubusercontent.com/user/repo/main/README.md`

#### Low Difficulty (Basic Extraction)
- **Simple URLs**: Standard blog posts and articles
- **Direct Research**: Natural language queries requiring search + extraction
- **Multiple URLs**: Batch extraction scenarios
- **Control Scenarios**: Easy-to-access domains

## Test Framework Implementation

### Test Metrics

| Metric | Version A | Version B | Success Criteria |
|--------|-----------|-----------|------------------|
| **Success Rate** | Baseline | Target | ≥15% improvement |
| **Response Time** | Baseline | Target | ≤20% improvement |
| **Token Efficiency** | Baseline | Target | ≤15% improvement |
| **Output Quality** | Baseline | Target | ≥20% improvement |
| **Error Recovery** | Baseline | Target | ≥25% improvement |

### Success Evaluation

**Output Quality Assessment (1-5 scale):**
1. **Poor**: Incomplete, inaccurate, or unusable results
2. **Fair**: Basic extraction but missing key information
3. **Good**: Adequate coverage with some gaps
4. **Very Good**: Comprehensive with minor omissions
5. **Excellent**: Complete, well-structured, actionable results

**Structured Response Evaluation:**
- ✅ All required fields present (Summary, Sources, Details, Confidence, Notes)
- ✅ Sources properly formatted with status indicators
- ✅ Confidence level justified by content quality
- ✅ Technical notes provide transparency about fallbacks used

## Expected Results Analysis

### Hypothesis

**Version B should outperform Version A because:**
- **Comprehensive Runbook**: Step-by-step operating procedure ensures consistency
- **Decision Heuristics**: Domain-specific optimization strategies
- **Enhanced Fallbacks**: Intelligent retry sequences with service switching
- **Validation Logic**: Content quality thresholds prevent poor results
- **Structured Output**: Consistent formatting improves user experience

### Key Improvements to Measure

1. **Intelligent Domain Handling**:
   - Version A: Generic fallback strategies
   - Version B: Domain-specific heuristics (docs.*, news, forums, APIs)

2. **Error Recovery Sophistication**:
   - Version A: Basic retry with exponential backoff
   - Version B: Multi-service switching with documentation-friendly readers

3. **Output Standardization**:
   - Version A: Unstructured responses
   - Version B: Structured JSON with consistent fields

4. **Validation Quality**:
   - Version A: Basic content extraction
   - Version B: Content quality thresholds and deduplication

## Testing Protocol

### Manual Validation Framework

**For each test scenario:**

1. **Fresh Claude Code Session**: Start new session for each test
2. **Execute Prompt**: Use exact test prompt from scenario
3. **Wait for Completion**: Allow agent to run full process
4. **Document Results**:
   - Success/failure status
   - Response time measurement
   - Token usage (if available)
   - Output quality rating (1-5)
   - Structured response compliance
   - Error recovery behavior

### Expected Agent Behaviors

#### **Version A Expected Pattern**:
```
Input URL → Basic extraction attempt → Error → Simple retry → Success/Failure
```

#### **Version B Expected Pattern**:
```
Input URL → Intent detection → Domain classification → Primary extraction →
Fallback gating → Multi-service retry → Validation → Structured output
```

## Success Criteria

### Quantitative Benchmarks
- **Reliability Improvement**: ≥15% higher success rate on problematic domains
- **Performance Enhancement**: ≤20% faster response times on average
- **Quality Consistency**: Structured responses in ≥90% of successful extractions
- **Error Recovery**: ≥25% better handling of 403/422/429 scenarios

### Qualitative Benchmarks
- **Better User Experience**: Clear, actionable results with proper citations
- **Transparent Process**: Detailed methodology notes explaining fallbacks used
- **Professional Output**: Consistent formatting and comprehensive information
- **Smart Domain Handling**: Optimized strategies for different domain types

## Test Execution Plan

### Phase 1: Baseline Testing (Version A)
1. Revert agent to previous version if necessary
2. Execute all 24 test scenarios
3. Document baseline performance metrics
4. Store results in `test-results/agent-baseline-{timestamp}.json`

### Phase 2: Updated Testing (Version B)
1. Ensure current agent version is deployed
2. Execute identical 24 test scenarios
3. Document improved performance metrics
4. Store results in `test-results/agent-updated-{timestamp}.json`

### Phase 3: Comparative Analysis
1. Calculate improvement percentages
2. Identify specific scenario improvements
3. Document user experience enhancements
4. Generate final recommendation

## Troubleshooting Guide

### Common Issues

**Agent Not Responding**:
- Verify agent is properly registered in plugin manifest
- Check that Task tool delegation is working correctly
- Confirm model inheritance is functioning

**Structured Output Missing**:
- Verify runbook procedures are being followed
- Check if validation thresholds are being applied
- Document any deviation from expected output format

**Performance Degradation**:
- Monitor response times across test runs
- Check if enhanced heuristics are adding overhead
- Validate that retry caps are being respected

**Fallback Not Triggering**:
- Verify error detection logic is working
- Check domain classification accuracy
- Test fallback sequence with known problematic URLs

## File References

- **Current Agent**: `plugins/search-plus/agents/search-plus.md`
- **Test Framework**: To be created in `scripts/agent-ab-test.mjs`
- **Test Results**: `test-results/agent-{baseline|updated}-{timestamp}.json`
- **Comparison Analysis**: `docs/eval-008-results-summary.md` (to be created)

## Testing Execution Plan

### **Option A: Comparative Testing (Version A vs B)**
**Phase 1: Baseline Testing (Version A)**
1. Revert agent: `git checkout 8ba7549 -- plugins/search-plus/agents/search-plus.md`
2. Execute all 24 test scenarios
3. Document baseline performance metrics
4. Store results in `test-results/agent-baseline-{timestamp}.json`

**Phase 2: Updated Testing (Version B)**
1. Restore current agent: `git checkout HEAD -- plugins/search-plus/agents/search-plus.md`
2. Execute identical 24 test scenarios
3. Document improved performance metrics
4. Store results in `test-results/agent-updated-{timestamp}.json`

**Phase 3: Comparative Analysis**
1. Calculate improvement percentages
2. Identify specific scenario improvements
3. Document user experience enhancements
4. Generate final recommendation

### **Option B: Direct Testing (Version B Only)**
**Phase 1: Current Agent Validation**
1. Ensure current agent is deployed (Version B)
2. Execute all 24 test scenarios
3. Document performance metrics
4. Store results in `test-results/agent-current-{timestamp}.json`

**Phase 2: Results Analysis**
1. Analyze success rates and patterns
2. Identify improvement opportunities
3. Document agent effectiveness
4. Generate optimization recommendations

### **Recommendation**: Start with Option B to validate current agent improvements immediately

---

**Evaluation Status: 📋 FRAMEWORK READY**
**Next Steps**: Begin direct testing with current Version B agent

---

*Framework version: 1.0.0*
*Test scope: Search Plus Agent optimization and reliability improvement*
*Created: 2025-10-26*