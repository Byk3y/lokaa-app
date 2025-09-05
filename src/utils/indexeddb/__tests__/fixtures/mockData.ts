/**
 * Test Fixtures and Mock Data for IndexedDB Testing
 * 
 * Provides consistent test data across all IndexedDB tests
 */

import { CacheEntry } from '../../types';

// Mock User Data
export const mockUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'John Doe',
    profile_url: 'https://example.com/avatar1.jpg',
    email: 'john@example.com',
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    full_name: 'Jane Smith',
    profile_url: 'https://example.com/avatar2.jpg',
    email: 'jane@example.com',
    created_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    full_name: 'Bob Wilson',
    profile_url: null,
    email: 'bob@example.com',
    created_at: '2024-01-03T00:00:00Z'
  }
];

// Mock Space Data
export const mockSpaces = [
  {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    name: 'Test Space 1',
    subdomain: 'testspace1',
    description: 'A test space for unit testing',
    owner_id: mockUsers[0].id,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    name: 'Test Space 2', 
    subdomain: 'testspace2',
    description: 'Another test space',
    owner_id: mockUsers[1].id,
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Mock Space Members Data
export const mockSpaceMembers = [
  {
    id: '1',
    user_id: mockUsers[0].id,
    space_id: mockSpaces[0].id,
    role: 'owner',
    status: 'active',
    is_online: true,
    last_active_at: new Date().toISOString(),
    joined_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '2',
    user_id: mockUsers[1].id,
    space_id: mockSpaces[0].id,
    role: 'admin',
    status: 'active',
    is_online: true,
    last_active_at: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    joined_at: '2024-01-02T00:00:00Z'
  },
  {
    id: '3',
    user_id: mockUsers[2].id,
    space_id: mockSpaces[0].id,
    role: 'member',
    status: 'active',
    is_online: false,
    last_active_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    joined_at: '2024-01-03T00:00:00Z'
  }
];

// Mock Conversation Data
export const mockConversations = [
  {
    id: 'conv1111-1111-1111-1111-111111111111',
    is_group: false,
    created_by: mockUsers[0].id,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'conv2222-2222-2222-2222-222222222222',
    is_group: false,
    created_by: mockUsers[1].id,
    created_at: '2024-01-02T00:00:00Z'
  }
];

// Mock User Conversations View Data
export const mockUserConversations = [
  {
    conversation_id: mockConversations[0].id,
    user_id: mockUsers[0].id,
    other_user_id: mockUsers[1].id,
    other_user_name: mockUsers[1].full_name,
    other_user_avatar: mockUsers[1].profile_url,
    last_message: 'Hello there!',
    last_message_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    last_message_sender: mockUsers[1].id,
    unread_count: 2
  },
  {
    conversation_id: mockConversations[1].id,
    user_id: mockUsers[1].id,
    other_user_id: mockUsers[0].id,
    other_user_name: mockUsers[0].full_name,
    other_user_avatar: mockUsers[0].profile_url,
    last_message: 'How are you?',
    last_message_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    last_message_sender: mockUsers[0].id,
    unread_count: 0
  }
];

// Mock Cache Entries
export const createMockCacheEntry = <T>(data: T, ageInMs = 0): CacheEntry<T> => ({
  data,
  timestamp: Date.now() - ageInMs,
  key: `test_${Date.now()}`,
  ttl: 300000, // 5 minutes
  metadata: {
    query: 'test_query',
    params: {},
    spaceId: mockSpaces[0].id
  }
});

// Mock Cache Scenarios
export const cacheScenarios = {
  fresh: createMockCacheEntry(mockSpaceMembers, 1000), // 1 second old
  stale: createMockCacheEntry(mockSpaceMembers, 600000), // 10 minutes old
  expired: createMockCacheEntry(mockSpaceMembers, 3600000), // 1 hour old
  empty: null
};

// Mock Supabase Responses
export const mockSupabaseResponses = {
  spaceMembers: {
    success: { data: mockSpaceMembers, error: null },
    error: { data: null, error: new Error('Database connection failed') },
    timeout: { data: null, error: new Error('Query timeout after 5000ms') },
    empty: { data: [], error: null }
  },
  userProfile: {
    success: { data: mockUsers[0], error: null },
    error: { data: null, error: new Error('User not found') },
    notFound: { data: null, error: null }
  },
  userConversations: {
    success: { data: mockUserConversations, error: null },
    error: { data: null, error: new Error('Conversations query failed') },
    empty: { data: [], error: null }
  },
  authUser: {
    success: { data: { user: mockUsers[0] }, error: null },
    error: { data: { user: null }, error: new Error('Authentication failed') },
    unauthenticated: { data: { user: null }, error: null }
  }
};

// Mock Mobile Browser Environments
export const mockMobileEnvironments = {
  safari: {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    platform: 'iPhone',
    isMobile: true,
    blocksRequests: true
  },
  chrome: {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    platform: 'Android',
    isMobile: true,
    blocksRequests: true
  },
  desktop: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    isMobile: false,
    blocksRequests: false
  }
};

// Mock Performance Metrics
export const mockMetrics = {
  initial: {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    mobileBlockingDetected: 0,
    offlineReturns: 0,
    networkFailures: 0
  },
  withActivity: {
    totalRequests: 100,
    cacheHits: 75,
    cacheMisses: 25,
    mobileBlockingDetected: 5,
    offlineReturns: 3,
    networkFailures: 2
  }
};

// Test Helper Functions
export const createTestCacheKey = (type: string, id: string, extra?: string): string => {
  return `test_${type}_${id}${extra ? '_' + extra : ''}`;
};

export const createExpiredCacheEntry = <T>(data: T): CacheEntry<T> => 
  createMockCacheEntry(data, 3600000); // 1 hour old

export const createFreshCacheEntry = <T>(data: T): CacheEntry<T> => 
  createMockCacheEntry(data, 1000); // 1 second old

// Mock IndexedDB Database
export const mockDatabaseStores = {
  SPACE_MEMBERS: 'space_members_cache',
  SPACES: 'spaces_cache',
  POSTS: 'posts_cache',
  CATEGORIES: 'categories_cache',
  USER_PROFILES: 'user_profiles_cache',
  USER_CONVERSATIONS: 'user_conversations_cache'
};

export const mockDatabaseVersion = 3;
export const mockDatabaseName = 'lokaa-supabase-cache-test'; 