/**
 * Error Handling Type Definitions
 * 
 * This file contains type definitions for error handling throughout the application
 * to replace 'any' usage in error handling code.
 */

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for better organization
 */
export type ErrorCategory = 
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'network'
  | 'database'
  | 'api'
  | 'ui'
  | 'business_logic'
  | 'system'
  | 'performance'
  | 'security'
  | 'unknown';

/**
 * Base application error interface
 */
export interface AppError {
  id: string;
  message: string;
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  timestamp: number;
  stackTrace?: string;
  context?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  cause?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
    field?: string;
    timestamp: string;
  };
  success: false;
  statusCode: number;
  requestId?: string;
}

/**
 * Validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
  constraint?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

/**
 * Error boundary state
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * Error recovery strategies
 */
export type ErrorRecoveryStrategy = 
  | 'retry'
  | 'fallback'
  | 'redirect'
  | 'reload'
  | 'silent'
  | 'report';

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  maxRetries: number;
  retryDelay: number;
  strategy: ErrorRecoveryStrategy;
  fallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  reportToService?: boolean;
  showUserFriendlyMessage?: boolean;
  allowRecovery?: boolean;
}

/**
 * Error fallback component props
 */
export interface ErrorFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  retry: () => void;
  reset: () => void;
  reportError: (error: Error, context?: Record<string, unknown>) => void;
}

/**
 * Error reporting service interface
 */
export interface ErrorReportingService {
  reportError: (error: AppError) => Promise<void>;
  reportBatch: (errors: AppError[]) => Promise<void>;
  setUser: (userId: string, userInfo?: Record<string, unknown>) => void;
  setContext: (context: Record<string, unknown>) => void;
  addBreadcrumb: (message: string, category?: string, data?: Record<string, unknown>) => void;
}

/**
 * Error handler result
 */
export interface ErrorHandlerResult {
  handled: boolean;
  shouldThrow: boolean;
  fallbackValue?: unknown;
  retryable: boolean;
  userMessage?: string;
  recoveryAction?: () => void;
}

/**
 * Global error handler
 */
export interface GlobalErrorHandler {
  handleError: (error: Error, context?: Record<string, unknown>) => ErrorHandlerResult;
  handleUnhandledRejection: (event: PromiseRejectionEvent) => void;
  handleUnhandledError: (event: ErrorEvent) => void;
  reportError: (error: AppError) => void;
  addErrorBoundary: (boundaryId: string, config: ErrorHandlerConfig) => void;
  removeErrorBoundary: (boundaryId: string) => void;
}

/**
 * Error metrics for monitoring
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCode: Record<string, number>;
  errorRate: number;
  averageErrorsPerUser: number;
  topErrors: Array<{
    code: string;
    message: string;
    count: number;
    lastSeen: number;
  }>;
  errorTrends: Array<{
    timestamp: number;
    count: number;
    category: ErrorCategory;
  }>;
}

/**
 * Network error types
 */
export interface NetworkError extends AppError {
  category: 'network';
  statusCode?: number;
  url: string;
  method: string;
  timeout?: boolean;
  retryCount: number;
  responseHeaders?: Record<string, string>;
  requestPayload?: unknown;
}

/**
 * Database error types
 */
export interface DatabaseError extends AppError {
  category: 'database';
  table?: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  query?: string;
  parameters?: unknown[];
  constraint?: string;
  postgresCode?: string;
}

/**
 * Authentication error types
 */
export interface AuthenticationError extends AppError {
  category: 'authentication';
  authMethod?: 'email' | 'oauth' | 'token' | 'anonymous';
  tokenExpired?: boolean;
  invalidCredentials?: boolean;
  accountLocked?: boolean;
  requiresVerification?: boolean;
}

/**
 * Authorization error types
 */
export interface AuthorizationError extends AppError {
  category: 'authorization';
  requiredPermission?: string;
  userRole?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
}

/**
 * Validation error types
 */
export interface SchemaValidationError extends AppError {
  category: 'validation';
  field: string;
  expectedType: string;
  actualValue: unknown;
  constraint?: string;
  schema?: string;
}

/**
 * Business logic error types
 */
export interface BusinessLogicError extends AppError {
  category: 'business_logic';
  businessRule: string;
  violatedConstraints: string[];
  suggestedAction?: string;
}

/**
 * Performance error types
 */
export interface PerformanceError extends AppError {
  category: 'performance';
  operation: string;
  duration: number;
  threshold: number;
  memoryUsage?: number;
  cpuUsage?: number;
  resourceType?: 'memory' | 'cpu' | 'network' | 'disk';
}

/**
 * Error context for debugging
 */
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  timestamp: number;
  buildVersion?: string;
  environment?: string;
  feature?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  breadcrumbs?: Array<{
    timestamp: number;
    message: string;
    category?: string;
    data?: Record<string, unknown>;
  }>;
}

/**
 * Error recovery information
 */
export interface ErrorRecoveryInfo {
  canRecover: boolean;
  recoveryStrategies: ErrorRecoveryStrategy[];
  suggestedAction?: string;
  userMessage?: string;
  technicalDetails?: string;
  reportId?: string;
  supportContact?: string;
}