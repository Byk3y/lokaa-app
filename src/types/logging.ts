/**
 * Logging System Type Definitions
 * 
 * This file contains type definitions for the logging system
 * to improve type safety and reduce 'any' usage in logger utilities.
 */

/**
 * Valid log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Loggable value types
 */
export type LoggableValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Error
  | Record<string, unknown>
  | unknown[];

/**
 * Logger category types
 */
export type LogCategory = 
  | 'App'
  | 'Auth'
  | 'Chat'
  | 'Component'
  | 'Context'
  | 'Classroom'
  | 'Database'
  | 'Error'
  | 'Hook'
  | 'Navigation'
  | 'Page'
  | 'Performance'
  | 'Realtime'
  | 'Service'
  | 'Store'
  | 'Utils'
  | 'Validation'
  | string; // Allow custom categories

/**
 * Log entry structure
 */
export interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: number;
  args?: LoggableValue[];
  error?: Error;
  context?: Record<string, unknown>;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  categories: LogCategory[];
  excludeCategories: LogCategory[];
  maxEntries: number;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
}

/**
 * Logger metrics
 */
export interface LoggingMetrics {
  totalLogs: number;
  totalTime: number;
  averageTime: number;
  logsByLevel: Record<LogLevel, number>;
  logsByCategory: Record<LogCategory, number>;
  errorRate: number;
  performanceIssues: number;
}

/**
 * Log method signature
 */
export interface LogMethod {
  (category: LogCategory, message: string, ...args: LoggableValue[]): void;
}

/**
 * Error log method signature
 */
export interface ErrorLogMethod {
  (category: LogCategory, message: string, error?: Error, ...args: LoggableValue[]): void;
}

/**
 * Performance log method signature
 */
export interface PerformanceLogMethod {
  (category: LogCategory, operation: string, duration: number, ...args: LoggableValue[]): void;
}

/**
 * Logger interface
 */
export interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: ErrorLogMethod;
  critical: ErrorLogMethod;
  performance: PerformanceLogMethod;
  startup: LogMethod;
  group: (category: LogCategory, title: string, collapsed?: boolean) => void;
  groupEnd: () => void;
  table: (category: LogCategory, data: Record<string, unknown>, title?: string) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  assert: (condition: boolean, category: LogCategory, message: string, ...args: LoggableValue[]) => void;
  getMetrics: () => LoggingMetrics;
  resetMetrics: () => void;
  setEnabled: (enabled: boolean) => void;
  getStatus: () => LoggerStatus;
}

/**
 * Logger status
 */
export interface LoggerStatus {
  isEnabled: boolean;
  environment: string;
  productionSafe: boolean;
  devLoggerStatus: unknown;
  currentLevel: LogLevel;
  categories: LogCategory[];
  metrics: LoggingMetrics;
}

/**
 * Development logger configuration
 */
export interface DevLoggerConfig {
  deduplicationWindow: number;
  rateLimit: number;
  disabledCategories: Set<LogCategory>;
  allowedCategories: Set<LogCategory>;
  maxCacheSize: number;
  enableGrouping: boolean;
  enableTimestamps: boolean;
}

/**
 * Log filter options
 */
export interface LogFilter {
  level?: LogLevel;
  category?: LogCategory;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  hasError?: boolean;
  minDuration?: number;
}

/**
 * Log export options
 */
export interface LogExportOptions {
  format: 'json' | 'csv' | 'txt';
  filter?: LogFilter;
  maxEntries?: number;
  includeMetrics?: boolean;
}

/**
 * Remote logging configuration
 */
export interface RemoteLoggerConfig {
  endpoint: string;
  apiKey: string;
  batchSize: number;
  flushInterval: number;
  enableCompression: boolean;
  retryAttempts: number;
  headers?: Record<string, string>;
}

/**
 * Log batch for remote sending
 */
export interface LogBatch {
  entries: LogEntry[];
  timestamp: number;
  sessionId: string;
  userId?: string;
  environment: string;
  version: string;
}