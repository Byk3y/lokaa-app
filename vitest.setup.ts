import { vi } from 'vitest';
import 'fake-indexeddb/auto';
import { Blob } from 'fetch-blob';

// Security event logging setup
interface AnalyticsEvent {
  type: string;
  context?: {
    path?: string;
    [key: string]: any;
  };
  meta?: Record<string, any>;
}

export const securityEvents: Array<AnalyticsEvent> = [];
const mockEventInsert = vi.fn((evt: AnalyticsEvent) => {
  securityEvents.push(evt);
  return Promise.resolve({ data: evt, error: null });
});

const mockAlertInsert = vi.fn((evt: AnalyticsEvent) => {
  securityEvents.push(evt);
  return Promise.resolve({ data: evt, error: null });
});

global.logSecurityEvent = mockEventInsert;
global.logSecurityAlert = mockAlertInsert;



// Initialize fake-indexeddb first
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import FDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

global.indexedDB = new FDBFactory() as any;
global.IDBKeyRange = FDBKeyRange as any;

// 1. File and Blob polyfills
class MockFile extends Blob implements File {
  name: string;
  lastModified: number;
  webkitRelativePath: string = '';
  
  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    super(fileBits, options);
    this.name = fileName;
    this.lastModified = options?.lastModified ?? Date.now();
  }
}

global.Blob = Blob;
global.File = MockFile as any;

// 2. URL polyfill
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
}

// Polyfill crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    ...global.crypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  },
  writable: true,
  configurable: true
});

// 3. Storage stubs
const createStorageStub = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() { return store.size; }
  } as Storage;
};

global.localStorage = createStorageStub();
global.sessionStorage = createStorageStub();

// 4. Supabase mock with RLS support
const supabaseMock = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => Promise.resolve({ data: null, error: null })),
    delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    refreshSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null }))
  }
};

const getSupabaseClientMock = vi.fn(() => supabaseMock);

vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: getSupabaseClientMock
}));

// 5. Fetch mock
const usedTokens = new Set<string>();
const tokenTimestamps = new Map<string, number>();

const mockFetch = vi.fn((url: string, options?: RequestInit) => {
  // CSRF token endpoint
  if (url === '/api/auth/csrf') {
    const token = 'test-csrf-token-' + Date.now();
    tokenTimestamps.set(token, Date.now());
    return Promise.resolve(new Response(JSON.stringify({ token }), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    }));
  }

  // Posts endpoint
  if (url === '/api/posts') {
    const token = options?.headers?.['x-csrf-token'];
    if (!token) {
      const event = {
        type: 'security.csrf_fail',
        context: {
          path: '/api/posts',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Missing CSRF token'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Missing CSRF token' }), {
        status: 403,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    const timestamp = tokenTimestamps.get(token);
    if (!timestamp) {
      const event = {
        type: 'security.csrf_fail',
        context: {
          path: '/api/posts',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Invalid CSRF token'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Invalid CSRF token' }), {
        status: 403,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    // Check for token expiry (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      const event = {
        type: 'security.csrf_fail',
        context: {
          path: '/api/posts',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Token expired'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Invalid CSRF token' }), {
        status: 403,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    // Check for token reuse
    if (usedTokens.has(token)) {
      const event = {
        type: 'security.csrf_fail',
        context: {
          path: '/api/posts',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Token reuse'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Invalid CSRF token' }), {
        status: 403,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    // Valid token, mark as used
    usedTokens.add(token);
    return Promise.resolve(new Response(JSON.stringify({ data: null }), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    }));
  }

  // Auth refresh endpoint
  if (url === '/api/auth/refresh') {
    const token = options?.headers?.['x-refresh-token'];
    if (!token) {
      const event = {
        type: 'security.session_anomaly',
        context: {
          path: '/api/auth/refresh',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Missing refresh token'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Missing refresh token' }), {
        status: 401,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    const timestamp = tokenTimestamps.get(token);
    if (!timestamp) {
      const event = {
        type: 'security.session_anomaly',
        context: {
          path: '/api/auth/refresh',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Invalid refresh token'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Invalid refresh token' }), {
        status: 401,
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }

    // Check for token reuse after grace period
    if (Date.now() - timestamp > 10 * 1000) {
      const event = {
        type: 'security.session_anomaly',
        context: {
          path: '/api/auth/refresh',
          method: options?.method || 'GET'
        },
        meta: {
          reason: 'Token reuse after grace period'
        }
      };
      mockEventInsert(event);
      return Promise.resolve(new Response(JSON.stringify({ message: 'Token reuse detected' }), {
        status: 440,
        headers: new Headers({ 
          'Content-Type': 'application/json',
          'x-refresh-token-reuse': 'true'
        })
      }));
    }

    return Promise.resolve(new Response(JSON.stringify({ session: { access_token: 'new_token' } }), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    }));
  }

  // Security events endpoint
  if (url === '/api/security/events') {
    const event = JSON.parse(options?.body as string);
    mockEventInsert(event);
    mockAlertInsert(event);
    return Promise.resolve(new Response(JSON.stringify({ data: event }), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    }));
  }

  // Security events aggregation endpoint
  if (url === '/api/security/events/aggregate') {
    return Promise.resolve(new Response(JSON.stringify([
      { event_type: 'security.csrf_fail', count: 5 },
      { event_type: 'security.session_anomaly', count: 3 }
    ]), {
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' })
    }));
  }

  // Default response
  return Promise.resolve(new Response(JSON.stringify({ data: null }), {
    status: 200,
    headers: new Headers({ 'Content-Type': 'application/json' })
  }));
}) as any;

global.fetch = mockFetch;

// 6. Image and Video mocks for file validation
global.Image = class {
  onload: () => void = () => {};
  onerror: () => void = () => {};
  src: string = '';
  width: number = 0;
  height: number = 0;
  
  constructor() {
    setTimeout(() => {
      this.width = 800;
      this.height = 600;
      this.onload();
    }, 100);
  }
} as any;

global.HTMLVideoElement = class {
  videoWidth: number = 1920;
  videoHeight: number = 1080;
  readyState: number = 4;
} as any;

// Mock other common dependencies
vi.mock('@/utils/supabaseIndexedDBBridge', () => ({
  supabaseIndexedDBBridge: {
    getUserConversations: vi.fn(() => Promise.resolve({ data: [], error: null })),
    initialize: vi.fn(() => Promise.resolve()),
    cleanup: vi.fn(() => Promise.resolve())
  }
}));

// Mock mobile validation service
vi.mock('@/services/MobileValidationService', () => ({
  MobileValidationService: {
    getInstance: vi.fn(() => ({
      validateNetworkConditions: vi.fn(() => ({ isValid: true, errors: [] }))
    }))
  }
}));

// Mock DOM elements that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

console.log('✅ [Vitest Setup] Test environment initialized with unified mocks'); 