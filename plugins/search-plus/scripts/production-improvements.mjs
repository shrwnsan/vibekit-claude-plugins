/**
 * Production Readiness Improvements
 * Enhanced error handling, logging, and monitoring for production deployment
 */

import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { Transform, pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

/**
 * Structured Logger with correlation IDs
 */
export class StructuredLogger {
  constructor(service = 'search-plus', logLevel = 'info') {
    this.service = service;
    this.logLevel = logLevel;
    this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
    this.correlationId = null;
  }

  withCorrelation(id) {
    this.correlationId = id;
    return this;
  }

  log(level, message, metadata = {}) {
    if (this.levels[level] <= this.levels[this.logLevel]) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        service: this.service,
        correlationId: this.correlationId,
        message,
        metadata
      };

      console[level](JSON.stringify(logEntry));
    }
  }

  error(message, error, metadata = {}) {
    this.log('error', message, {
      ...metadata,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      }
    });
  }

  warn(message, metadata = {}) {
    this.log('warn', message, metadata);
  }

  info(message, metadata = {}) {
    this.log('info', message, metadata);
  }

  debug(message, metadata = {}) {
    this.log('debug', message, metadata);
  }
}

/**
 * Circuit Breaker Pattern for Service Protection
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }

  async execute(operation, context = {}) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      isHealthy: this.state !== 'OPEN'
    };
  }
}

/**
 * Rate Limiter with Token Bucket Algorithm
 */
export class RateLimiter {
  constructor(bucketSize, refillRate, refillInterval = 1000) {
    this.bucketSize = bucketSize;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.tokens = bucketSize;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillInterval) {
      const tokensToAdd = Math.floor(elapsed / this.refillInterval) * this.refillRate;
      this.tokens = Math.min(this.bucketSize, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  waitForToken(tokens = 1) {
    return new Promise(resolve => {
      const checkToken = async () => {
        if (await this.consume(tokens)) {
          resolve();
        } else {
          setTimeout(checkToken, 100);
        }
      };
      checkToken();
    });
  }
}

/**
 * Health Check System
 */
export class HealthCheckRegistry {
  constructor() {
    this.checks = new Map();
  }

  register(name, check, options = {}) {
    this.checks.set(name, {
      fn: check,
      timeout: options.timeout || 5000,
      critical: options.critical || false
    });
  }

  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check not found: ${name}`);
    }

    const startTime = Date.now();
    try {
      const result = await Promise.race([
        check.fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), check.timeout)
        )
      ]);

      return {
        name,
        status: 'healthy',
        duration: Date.now() - startTime,
        critical: check.critical,
        details: result
      };
    } catch (error) {
      return {
        name,
        status: 'unhealthy',
        duration: Date.now() - startTime,
        critical: check.critical,
        error: error.message
      };
    }
  }

  async runAllChecks() {
    const results = await Promise.all(
      Array.from(this.checks.keys()).map(name => this.runCheck(name))
    );

    const overall = results.every(r => !r.critical || r.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return {
      status: overall,
      checks: results,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Graceful Shutdown Handler
 */
export class GracefulShutdown {
  constructor() {
    this.handlers = [];
    this.shuttingDown = false;
    this.setupSignalHandlers();
  }

  register(handler, timeout = 5000) {
    this.handlers.push({ handler, timeout });
  }

  setupSignalHandlers() {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    for (const signal of signals) {
      process.on(signal, () => this.shutdown(signal));
    }
  }

  async shutdown(signal) {
    if (this.shuttingDown) {
      console.log('Force shutdown');
      process.exit(1);
    }

    this.shuttingDown = true;
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);

    const shutdownPromises = this.handlers.map(async ({ handler, timeout }) => {
      try {
        await Promise.race([
          handler(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
          )
        ]);
        console.log('✓ Shutdown handler completed');
      } catch (error) {
        console.error('✗ Shutdown handler failed:', error.message);
      }
    });

    await Promise.all(shutdownPromises);
    console.log('Graceful shutdown completed');
    process.exit(0);
  }
}

/**
 * Configuration Validation
 */
export class ConfigValidator {
  static validate(env) {
    const errors = [];
    const warnings = [];

    // Required fields
    const required = [];
    for (const field of required) {
      if (!env[field]) {
        errors.push(`Missing required environment variable: ${field}`);
      }
    }

    // Optional fields with defaults
    const optional = {
      'SEARCH_PLUS_TIMEOUT': { default: 10000, type: 'number' },
      'SEARCH_PLUS_CACHE_SIZE': { default: 1000, type: 'number' },
      'SEARCH_PLUS_LOG_LEVEL': { default: 'info', type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
      'SEARCH_PLUS_ENABLE_METRICS': { default: 'true', type: 'boolean' },
      'SEARCH_PLUS_MAX_RETRIES': { default: 3, type: 'number' }
    };

    for (const [key, config] of Object.entries(optional)) {
      const value = env[key];

      if (value === undefined) {
        warnings.push(`Using default for ${key}: ${config.default}`);
        continue;
      }

      // Type validation
      if (config.type === 'number' && isNaN(Number(value))) {
        errors.push(`${key} must be a number, got: ${value}`);
      }

      if (config.type === 'boolean' && !['true', 'false'].includes(value.toLowerCase())) {
        errors.push(`${key} must be true or false, got: ${value}`);
      }

      if (config.enum && !config.enum.includes(value)) {
        errors.push(`${key} must be one of: ${config.enum.join(', ')}, got: ${value}`);
      }
    }

    return { errors, warnings };
  }
}

/**
 * Streaming Response Processor for Large Result Sets
 */
export class StreamingProcessor extends Transform {
  constructor(options = {}) {
    super({ objectMode: true });
    this.batchSize = options.batchSize || 100;
    this.buffer = [];
    this.transformer = options.transformer;
    this.validator = options.validator;
  }

  _transform(chunk, encoding, callback) {
    this.buffer.push(chunk);

    if (this.buffer.length >= this.batchSize) {
      this.processBatch();
    }

    callback();
  }

  _flush(callback) {
    if (this.buffer.length > 0) {
      this.processBatch();
    }
    callback();
  }

  processBatch() {
    const batch = this.buffer.splice(0, this.batchSize);

    try {
      // Transform batch
      const transformed = this.transformer ? this.transformer(batch) : batch;

      // Validate if validator provided
      if (this.validator) {
        for (const item of transformed) {
          if (this.validator(item)) {
            this.push(item);
          }
        }
      } else {
        for (const item of transformed) {
          this.push(item);
        }
      }
    } catch (error) {
      this.emit('error', error);
    }
  }
}

/**
 * Async Retry with Exponential Backoff and Jitter
 */
export class AsyncRetry {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.jitter = options.jitter !== false;
    this.factor = options.factor || 2;
  }

  async execute(fn, context = {}) {
    let lastError;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;

        if (attempt === this.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }

        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  calculateDelay(attempt) {
    let delay = this.baseDelay * Math.pow(this.factor, attempt);
    delay = Math.min(delay, this.maxDelay);

    if (this.jitter) {
      // Add randomness to prevent thundering herd
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  isRetryableError(error) {
    const retryableCodes = [403, 429, 500, 502, 503, 504];
    const retryableMessages = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNREFUSED'
    ];

    return (
      retryableCodes.includes(error.code) ||
      retryableMessages.some(msg => error.message.includes(msg)) ||
      error.name === 'RetryableError'
    );
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Memory Leak Detector
 */
export class MemoryLeakDetector {
  constructor() {
    this.snapshots = [];
    this.maxSnapshots = 10;
  }

  takeSnapshot(label = '') {
    const usage = process.memoryUsage();
    const snapshot = {
      label,
      timestamp: Date.now(),
      ...usage
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  detectLeaks() {
    if (this.snapshots.length < 2) {
      return { hasLeaks: false, reason: 'Not enough snapshots' };
    }

    const oldest = this.snapshots[0];
    const newest = this.snapshots[this.snapshots.length - 1];
    const timeDiff = newest.timestamp - oldest.timestamp;

    const heapGrowth = newest.heapUsed - oldest.heapUsed;
    const growthRate = heapGrowth / timeDiff; // bytes per millisecond

    // Consider it a leak if growing more than 1MB per second consistently
    const hasLeaks = growthRate > 1000 && newest.heapUsed > 100 * 1024 * 1024; // 100MB threshold

    return {
      hasLeaks,
      growthRate: Math.round(growthRate * 1000), // bytes per second
      heapGrowthMB: Math.round(heapGrowth / 1024 / 1024),
      oldestHeapMB: Math.round(oldest.heapUsed / 1024 / 1024),
      newestHeapMB: Math.round(newest.heapUsed / 1024 / 1024),
      timeDiffSeconds: Math.round(timeDiff / 1000)
    };
  }

  getReport() {
    return {
      snapshots: this.snapshots.map(s => ({
        ...s,
        heapUsedMB: Math.round(s.heapUsed / 1024 / 1024),
        externalMB: Math.round(s.external / 1024 / 1024)
      })),
      leak: this.detectLeaks()
    };
  }
}