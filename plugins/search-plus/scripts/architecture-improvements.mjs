/**
 * Architectural Improvements for Response Standardization
 * SOLID principles and design patterns implementation
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Strategy Pattern for Score Normalization
 */
export class ScoreNormalizationStrategy {
  normalize(rawScore, index, totalResults) {
    throw new Error('Strategy must implement normalize method');
  }
}

export class LinearNormalization extends ScoreNormalizationStrategy {
  normalize(rawScore) {
    return Math.max(0, Math.min(1, Number(rawScore) || 0));
  }
}

export class LogarithmicNormalization extends ScoreNormalizationStrategy {
  normalize(rawScore) {
    const score = Number(rawScore) || 0;
    return Math.max(0, Math.min(1, Math.log1p(score) / Math.log1p(1)));
  }
}

export class ExponentialNormalization extends ScoreNormalizationStrategy {
  normalize(rawScore) {
    const score = Number(rawScore) || 0;
    return Math.max(0, Math.min(1, Math.pow(score, 0.5)));
  }
}

/**
 * Factory Pattern for Transformer Creation
 */
export class TransformerFactory {
  static strategies = {
    linear: () => new LinearNormalization(),
    logarithmic: () => new LogarithmicNormalization(),
    exponential: () => new ExponentialNormalization()
  };

  static createNormalizer(type = 'linear') {
    const Strategy = this.strategies[type];
    if (!Strategy) {
      throw new Error(`Unknown normalization strategy: ${type}`);
    }
    return Strategy();
  }
}

/**
 * Observer Pattern for Transformation Events
 */
export class TransformationObserver extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      transformations: 0,
      errors: 0,
      totalTime: 0
    };
  }

  onTransformationStart(service, query) {
    this.emit('transformation:start', { service, query, timestamp: Date.now() });
  }

  onTransformationComplete(service, query, duration, resultCount) {
    this.metrics.transformations++;
    this.metrics.totalTime += duration;
    this.emit('transformation:complete', {
      service,
      query,
      duration,
      resultCount,
      timestamp: Date.now()
    });
  }

  onTransformationError(service, query, error) {
    this.metrics.errors++;
    this.emit('transformation:error', {
      service,
      query,
      error,
      timestamp: Date.now()
    });
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageTime: this.metrics.transformations > 0
        ? this.metrics.totalTime / this.metrics.transformations
        : 0,
      errorRate: this.metrics.transformations > 0
        ? this.metrics.errors / this.metrics.transformations
        : 0
    };
  }
}

/**
 * Command Pattern for Transformation Operations
 */
export class TransformCommand {
  constructor(transformer, serviceName, response, query, observer) {
    this.transformer = transformer;
    this.serviceName = serviceName;
    this.response = response;
    this.query = query;
    this.observer = observer;
  }

  async execute() {
    const startTime = performance.now();
    this.observer?.onTransformationStart(this.serviceName, this.query);

    try {
      const result = await this.transformer.transform(this.response, this.query);
      const duration = performance.now() - startTime;

      this.observer?.onTransformationComplete(
        this.serviceName,
        this.query,
        duration,
        result.results?.length || 0
      );

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.observer?.onTransformationError(this.serviceName, this.query, error);
      throw error;
    }
  }
}

/**
 * Repository Pattern for Service Transformers
 */
export class TransformerRepository {
  constructor() {
    this.transformers = new Map();
    this.metadata = new Map();
  }

  register(serviceName, transformer, metadata = {}) {
    this.transformers.set(serviceName, transformer);
    this.metadata.set(serviceName, {
      registeredAt: new Date().toISOString(),
      version: '1.0.0',
      ...metadata
    });
  }

  get(serviceName) {
    const transformer = this.transformers.get(serviceName);
    if (!transformer) {
      throw new Error(`No transformer registered for: ${serviceName}`);
    }
    return transformer;
  }

  has(serviceName) {
    return this.transformers.has(serviceName);
  }

  list() {
    return Array.from(this.transformers.keys());
  }

  getMetadata(serviceName) {
    return this.metadata.get(serviceName);
  }

  getAllMetadata() {
    return Object.fromEntries(this.metadata);
  }
}

/**
 * Builder Pattern for Standard Responses
 */
export class StandardResponseBuilder {
  constructor() {
    this.reset();
  }

  reset() {
    this.response = {
      results: [],
      answer: null,
      query: '',
      response_time: 0,
      service: '',
      success_rate: 0.0,
      metadata: {
        total_results: 0,
        query_processed_at: new Date().toISOString(),
        service_info: {}
      }
    };
    return this;
  }

  withService(service) {
    this.response.service = service;
    return this;
  }

  withQuery(query) {
    this.response.query = query;
    return this;
  }

  withResponseTime(time) {
    this.response.response_time = time;
    return this;
  }

  withResults(results) {
    this.response.results = results;
    this.response.metadata.total_results = results.length;
    return this;
  }

  withAnswer(answer) {
    this.response.answer = answer;
    return this;
  }

  withSuccessRate(rate) {
    this.response.success_rate = Math.max(0, Math.min(1, rate));
    return this;
  }

  withServiceInfo(info) {
    this.response.metadata.service_info = info;
    return this;
  }

  build() {
    return { ...this.response };
  }
}

/**
 * Pipeline Pattern for Transformation Processing
 */
export class TransformationPipeline {
  constructor() {
    this.stages = [];
  }

  addStage(stage) {
    this.stages.push(stage);
    return this;
  }

  async process(data) {
    let result = data;
    for (const stage of this.stages) {
      result = await stage.execute(result);
    }
    return result;
  }
}

/**
 * Decorator Pattern for Enhanced Transformers
 */
export class TransformerDecorator {
  constructor(baseTransformer) {
    this.baseTransformer = baseTransformer;
  }

  async transform(response, query, baseResponse) {
    return this.baseTransformer.transform(response, query, baseResponse);
  }
}

export class CachingDecorator extends TransformerDecorator {
  constructor(baseTransformer, cache = new Map()) {
    super(baseTransformer);
    this.cache = cache;
    this.maxSize = 1000;
  }

  async transform(response, query, baseResponse) {
    const key = this.generateKey(response, query);

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await super.transform(response, query, baseResponse);

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
    return result;
  }

  generateKey(response, query) {
    return `${JSON.stringify(response).slice(0, 100)}:${query}`;
  }
}

export class MetricsDecorator extends TransformerDecorator {
  constructor(baseTransformer, observer) {
    super(baseTransformer);
    this.observer = observer;
  }

  async transform(response, query, baseResponse) {
    const command = new TransformCommand(
      this.baseTransformer,
      baseResponse.service,
      response,
      query,
      this.observer
    );
    return command.execute();
  }
}

/**
 * Singleton Pattern for Global Configuration
 */
export class ConfigurationManager {
  constructor() {
    if (ConfigurationManager.instance) {
      return ConfigurationManager.instance;
    }

    this.config = {
      scoreNormalization: 'linear',
      enableCaching: true,
      cacheSize: 1000,
      enableMetrics: true,
      batchSize: 10,
      timeout: 10000
    };

    ConfigurationManager.instance = this;
  }

  static getInstance() {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig() {
    return { ...this.config };
  }
}