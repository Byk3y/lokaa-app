import { vi, beforeEach, afterEach } from 'vitest';

// Define types for our mocked implementations
type MockRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type MockHeaders = {
  get: vi.Mock;
  set: vi.Mock;
  append: vi.Mock;
  delete: vi.Mock;
  has: vi.Mock;
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock Headers class
const mockHeaders = vi.fn().mockImplementation(function(this: any, init?: HeadersInit) {
  const headerObj = {
    entries: new Map<string, string>(),
    get: vi.fn((key: string) => headerObj.entries.get(key.toLowerCase()) || null),
    set: vi.fn((key: string, value: string) => {
      headerObj.entries.set(key.toLowerCase(), value);
    }),
    has: vi.fn((key: string) => headerObj.entries.has(key.toLowerCase())),
    delete: vi.fn((key: string) => headerObj.entries.delete(key.toLowerCase())),
    forEach: vi.fn((callback: (value: string, key: string) => void) => {
      headerObj.entries.forEach((value, key) => callback(value, key));
    })
  };

  // Initialize headers with provided values
  if (init) {
    if (init instanceof Headers) {
      init.forEach((value, key) => headerObj.set(key, value));
    } else if (Array.isArray(init)) {
      init.forEach(([key, value]) => headerObj.set(key, value));
    } else {
      Object.entries(init).forEach(([key, value]) => headerObj.set(key, value));
    }
  }

  return headerObj;
});

global.Headers = mockHeaders as unknown as typeof Headers;

// Mock token usage tracking
interface TokenInfo {
  timestamp: number;
  used: boolean;
  requestCount: number;
  isRefreshToken?: boolean;
}

const tokenUsage = new Map<string, TokenInfo>();
const rateLimits = new Map<string, number>();
const securityEvents = new Map<string, any[]>();

// Mock fetch globally
const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);

  // Track rate limits per endpoint
  const endpoint = url.split('?')[0];
  const currentRequests = rateLimits.get(endpoint) || 0;
  const newRequestCount = currentRequests + 1;
  rateLimits.set(endpoint, newRequestCount);

  // Rate limit check (5 requests per endpoint)
  if (newRequestCount > 5) {
    const retryAfter = endpoint.includes('auth') ? '60' : '30';
    // Log rate limit event
    const events = securityEvents.get('security.rate_limit') || [];
    events.push({
      event_type: 'security.rate_limit',
      event_data: {
        endpoint,
        retry_after: parseInt(retryAfter),
        timestamp: Date.now()
      }
    });
    securityEvents.set('security.rate_limit', events);

    const responseHeaders = new Headers({
      'retry-after': retryAfter
    });

    return Promise.resolve(new Response(
      JSON.stringify({ message: 'Too many requests' }),
      {
        status: 429,
        headers: responseHeaders
      }
    ));
  }

  // CSRF token endpoint
  if (url === '/api/auth/csrf') {
    const token = 'test-csrf-token';
    tokenUsage.set(token, { timestamp: Date.now(), used: false, requestCount: 0 });
    return Promise.resolve(new Response(
      JSON.stringify({ token }),
      {
        status: 200,
        headers: new Headers()
      }
    ));
  }

  // Auth refresh endpoint
  if (url === '/api/auth/refresh') {
    const token = headers.get('x-csrf-token');
    if (!token) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Missing CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    const tokenInfo = tokenUsage.get(token);
    if (!tokenInfo) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Invalid CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    const now = Date.now();
    const tokenAge = now - tokenInfo.timestamp;

    // Token expired (15 minutes)
    if (tokenAge > 15 * 60 * 1000) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Invalid CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    // First use or within grace period (10 seconds)
    if (!tokenInfo.used || tokenAge <= 10 * 1000) {
      // Log token reuse event for grace period
      if (tokenInfo.used) {
        const events = securityEvents.get('security.token_reuse') || [];
        events.push({
          event_type: 'security.token_reuse',
          event_data: {
            token_id: token,
            previous_use: new Date(tokenInfo.timestamp).toISOString(),
            timestamp: now
          }
        });
        securityEvents.set('security.token_reuse', events);
      }

      const response = new Response(
        JSON.stringify({
          session: {
            access_token: 'new_token',
            refresh_token: 'new_refresh',
            expires_at: now + 3600000
          }
        }),
        {
          status: 200,
          headers: new Headers()
        }
      );

      // Mark token as used after successful response
      tokenInfo.used = true;
      tokenInfo.requestCount++;
      tokenInfo.timestamp = now;
      tokenUsage.set(token, tokenInfo);

      return Promise.resolve(response);
    }

    // Token reuse outside grace period
    const events = securityEvents.get('security.token_reuse') || [];
    events.push({
      event_type: 'security.token_reuse',
      event_data: {
        token_id: token,
        previous_use: new Date(tokenInfo.timestamp).toISOString(),
        timestamp: now
      }
    });
    securityEvents.set('security.token_reuse', events);

    const responseHeaders = new Headers({
      'x-refresh-token-reuse': 'true'
    });

    return Promise.resolve(new Response(
      JSON.stringify({ message: 'Token reuse detected' }),
      {
        status: 440,
        headers: responseHeaders
      }
    ));
  }

  // Posts endpoint
  if (url === '/api/posts') {
    const token = headers.get('x-csrf-token');
    if (!token) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Missing CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    const tokenInfo = tokenUsage.get(token);
    if (!tokenInfo) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Invalid CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    const now = Date.now();
    const tokenAge = now - tokenInfo.timestamp;

    // Token expired (15 minutes)
    if (tokenAge > 15 * 60 * 1000) {
      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Invalid CSRF token' }),
        {
          status: 403,
          headers: new Headers()
        }
      ));
    }

    // First use
    if (!tokenInfo.used) {
      const response = new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: new Headers()
        }
      );

      // Mark token as used after successful response
      tokenInfo.used = true;
      tokenInfo.requestCount++;
      tokenUsage.set(token, tokenInfo);

      return Promise.resolve(response);
    }

    // Token reuse
    return Promise.resolve(new Response(
      JSON.stringify({ message: 'Invalid CSRF token' }),
      {
        status: 403,
        headers: new Headers()
      }
    ));
  }

  // Session endpoint
  if (url === '/api/auth/session') {
    const auth = headers.get('Authorization');
    if (auth === 'Bearer expired-token') {
      // Log session expiry event
      const events = securityEvents.get('session.expire') || [];
      events.push({
        event_type: 'session.expire',
        event_data: {
          reason: 'token_expired',
          expires_at: Date.now() - 1000,
          timestamp: Date.now()
        }
      });
      securityEvents.set('session.expire', events);

      return Promise.resolve(new Response(
        JSON.stringify({ message: 'Session expired' }),
        {
          status: 440,
          headers: new Headers()
        }
      ));
    }
    return Promise.resolve(new Response(
      JSON.stringify({ session: { active: true } }),
      {
        status: 200,
        headers: new Headers()
      }
    ));
  }

  // Security events endpoint
  if (url === '/api/security/events') {
    const body = JSON.parse((init?.body as string) || '{}');
    const eventType = body.event_type;
    
    // Store the event in our mock storage
    const events = securityEvents.get(eventType) || [];
    events.push(body);
    securityEvents.set(eventType, events);

    return Promise.resolve(new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: new Headers()
      }
    ));
  }

  // Security events aggregate endpoint
  if (url === '/api/security/events/aggregate') {
    const aggregates = Array.from(securityEvents.entries()).map(([eventType, events]) => ({
      event_type: eventType,
      count: events.length
    }));

    return Promise.resolve(new Response(
      JSON.stringify(aggregates),
      {
        status: 200,
        headers: new Headers()
      }
    ));
  }

  // Security events threshold check endpoint
  if (url === '/api/security/events/check-thresholds') {
    // Simulate threshold checking logic
    const thresholds: Record<string, number> = {
      'security.csrf_fail': 20,
      'security.session_anomaly': 30
    };

    const violations = Array.from(securityEvents.entries())
      .filter(([eventType, events]) => events.length > (thresholds[eventType] || 100))
      .map(([eventType, events]) => ({
        event_type: eventType,
        count: events.length,
        threshold: thresholds[eventType]
      }));

    return Promise.resolve(new Response(
      JSON.stringify({ violations }),
      {
        status: 200,
        headers: new Headers()
      }
    ));
  }

  // CSP report endpoint
  if (url === '/api/security/csp-report') {
    // Log CSP violation event
    const events = securityEvents.get('security.csp_violation') || [];
    const body = JSON.parse((init?.body as string) || '{}');
    events.push({
      event_type: 'security.csp_violation',
      event_data: {
        'violated-directive': body['csp-report']['violated-directive'],
        'blocked-uri': body['csp-report']['blocked-uri'],
        timestamp: Date.now()
      }
    });
    securityEvents.set('security.csp_violation', events);

    return Promise.resolve(new Response(
      null,
      {
        status: 204,
        headers: new Headers()
      }
    ));
  }

  // Default response
  return Promise.resolve(new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: new Headers()
    }
  ));
});

// Type assertion for global fetch mock
global.fetch = mockFetch as unknown as typeof global.fetch;

// Mock Request
const mockRequest = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
  return {
    url: input,
    method: init?.method || 'GET',
    headers: new Headers(init?.headers),
    body: init?.body
  };
});

global.Request = mockRequest as unknown as typeof Request;

// Mock Response
const mockResponse = vi.fn().mockImplementation((body?: BodyInit | null, init?: ResponseInit) => {
  return {
    ok: init?.status ? init.status >= 200 && init.status < 300 : true,
    status: init?.status || 200,
    headers: new Headers(init?.headers),
    json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
    text: () => Promise.resolve(String(body))
  };
});

global.Response = mockResponse as unknown as typeof Response;

// Reset state between tests
beforeEach(() => {
  tokenUsage.clear();
  rateLimits.clear();
  securityEvents.clear();
  vi.clearAllMocks();
});

// Clean up mocks after each test
afterEach(() => {
  localStorageMock.clear();
  sessionStorageMock.clear();
  vi.useRealTimers();
});

// Export for test usage
export { tokenUsage, rateLimits, securityEvents }; 