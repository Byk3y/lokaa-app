/**
 * ChatApiService Unit Tests
 * 
 * Comprehensive test suite for the extracted ChatApiService.
 * Ensures all API operations work correctly and maintain compatibility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatApiService, type Conversation, type Message } from '../ChatApiService';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { getProtectedCurrentUser } from '@/utils/protectedAuth';
import { migrationAdapter } from '@/utils/indexeddb/migration/MigrationAdapter';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/protectedAuth');
vi.mock('@/utils/supabaseIndexedDBBridge');
vi.mock('@/utils/conversationUrlUtils', () => ({
  generateConversationSlug: vi.fn((id: string) => id.replace(/-/g, '').substring(0, 32)),
  findConversationIdFromSlug: vi.fn((slug: string, convs: any[]) => {
    return convs.find(c => c.conversation_id.replace(/-/g, '').substring(0, 32) === slug)?.conversation_id || null;
  })
}));

const mockSupabaseClient = {
  from: vi.fn(),
  rpc: vi.fn(),
};

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

describe('ChatApiService', () => {
  let apiService: ChatApiService;
  
  beforeEach(() => {
    apiService = new ChatApiService();
    vi.mocked(getSupabaseClient).mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.from.mockReturnValue(mockQuery);
    
    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be instantiable', () => {
    expect(apiService).toBeInstanceOf(ChatApiService);
  });

  it('should have all required methods', () => {
    expect(apiService.getUserConversations).toBeDefined();
    expect(apiService.getMessages).toBeDefined();
    expect(apiService.sendMessage).toBeDefined();
    expect(apiService.markAsRead).toBeDefined();
    expect(apiService.createConversation).toBeDefined();
    expect(apiService.getConversationBySlug).toBeDefined();
    expect(apiService.getCurrentUser).toBeDefined();
  });

  describe('getUserConversations', () => {
    const mockUserId = 'user-123';
    const mockConversationData = [
      {
        conversation_id: 'conv-1',
        is_group: false,
        conversation_name: null,
        created_at: '2024-01-01T00:00:00Z',
        latest_message_content: 'Hello',
        last_message_at: '2024-01-01T00:01:00Z',
        unread_count: 1,
        other_participants: [
          {
            user_id: 'user-456',
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        ]
      }
    ];

    it('should fetch conversations successfully on desktop', async () => {
      // Mock desktop environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true
      });

      mockQuery.select.mockResolvedValue({
        data: mockConversationData,
        error: null
      });

      const result = await apiService.getUserConversations(mockUserId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].conversation_id).toBe('conv-1');
      expect(result.data![0].participants).toHaveLength(1);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_conversations');
    });

    it('should use cache first on mobile devices', async () => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });

      // Mock successful cache result
      vi.mocked(supabaseIndexedDBBridge.getUserConversations).mockResolvedValue({
        data: mockConversationData,
        error: null
      });

      const result = await apiService.getUserConversations(mockUserId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(supabaseIndexedDBBridge.getUserConversations).toHaveBeenCalledWith(mockUserId);
      // Should not hit the network on cache hit
      expect(mockSupabaseClient.from).not.toHaveBeenCalled();
    });

    it('should fallback to network on mobile cache miss', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });

      // Mock cache miss
      vi.mocked(supabaseIndexedDBBridge.getUserConversations).mockRejectedValue(
        new Error('No cached data available')
      );

      mockQuery.select.mockResolvedValue({
        data: mockConversationData,
        error: null
      });

      const result = await apiService.getUserConversations(mockUserId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(supabaseIndexedDBBridge.getUserConversations).toHaveBeenCalledWith(mockUserId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_conversations');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.select.mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await apiService.getUserConversations(mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Database connection failed');
    });

    it('should force network when forceNetwork option is true', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true
      });

      mockQuery.select.mockResolvedValue({
        data: mockConversationData,
        error: null
      });

      const result = await apiService.getUserConversations(mockUserId, { forceNetwork: true });

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(supabaseIndexedDBBridge.getUserConversations).not.toHaveBeenCalled();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_conversations');
    });
  });

  describe('getMessages', () => {
    const mockConversationId = 'conv-123';
    const mockMessagesData = [
      {
        id: 'msg-1',
        content: 'Hello',
        created_at: '2024-01-01T00:00:00Z',
        sender_id: 'user-123',
        is_edited: false,
        attachment_url: null,
        attachment_type: null,
        read_by_ids: ['user-123'],
        sender: {
          id: 'user-123',
          full_name: 'John Doe',
          avatar_url: 'https://example.com/avatar.jpg'
        }
      }
    ];

    it('should fetch messages successfully', async () => {
      mockQuery.select.mockResolvedValue({
        data: mockMessagesData,
        error: null
      });

      const result = await apiService.getMessages(mockConversationId);

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('msg-1');
      expect(result.data![0].read_by_ids).toEqual(['user-123']);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_messages');
    });

    it('should handle missing conversation ID', async () => {
      const result = await apiService.getMessages('');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Conversation ID is required');
    });

    it('should handle database errors', async () => {
      mockQuery.select.mockResolvedValue({
        data: null,
        error: new Error('Permission denied')
      });

      const result = await apiService.getMessages(mockConversationId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Permission denied');
    });

    it('should ensure read_by_ids is always an array', async () => {
      const dataWithNullReadBy = [{
        ...mockMessagesData[0],
        read_by_ids: null
      }];

      mockQuery.select.mockResolvedValue({
        data: dataWithNullReadBy,
        error: null
      });

      const result = await apiService.getMessages(mockConversationId);

      expect(result.error).toBeNull();
      expect(result.data![0].read_by_ids).toEqual([]);
    });
  });

  describe('sendMessage', () => {
    const mockConversationId = 'conv-123';
    const mockSenderId = 'user-123';
    const mockContent = 'Hello world';
    const mockMessageResponse = {
      id: 'msg-new',
      content: mockContent,
      created_at: '2024-01-01T00:00:00Z',
      sender_id: mockSenderId,
      is_edited: false,
      attachment_url: null,
      attachment_type: null,
      read_by_ids: []
    };

    it('should send message successfully', async () => {
      mockQuery.single.mockResolvedValue({
        data: mockMessageResponse,
        error: null
      });

      const result = await apiService.sendMessage(
        mockConversationId,
        mockSenderId,
        mockContent
      );

      expect(result.error).toBeNull();
      expect(result.data!.id).toBe('msg-new');
      expect(result.data!.content).toBe(mockContent);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_messages');
    });

    it('should send message with attachments', async () => {
      const attachmentUrl = 'https://example.com/file.pdf';
      const attachmentType = 'application/pdf';

      mockQuery.single.mockResolvedValue({
        data: { ...mockMessageResponse, attachment_url: attachmentUrl },
        error: null
      });

      const result = await apiService.sendMessage(
        mockConversationId,
        mockSenderId,
        mockContent,
        attachmentUrl,
        attachmentType
      );

      expect(result.error).toBeNull();
      expect(result.data!.attachment_url).toBe(attachmentUrl);
    });

    it('should validate required parameters', async () => {
      const result = await apiService.sendMessage('', mockSenderId, mockContent);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Conversation ID, sender ID, and content are required');
    });

    it('should trim content before sending', async () => {
      const contentWithSpaces = '  hello world  ';
      
      mockQuery.single.mockResolvedValue({
        data: { ...mockMessageResponse, content: 'hello world' },
        error: null
      });

      const result = await apiService.sendMessage(
        mockConversationId,
        mockSenderId,
        contentWithSpaces
      );

      expect(result.error).toBeNull();
      expect(result.data!.content).toBe('hello world');
    });
  });

  describe('markAsRead', () => {
    const mockConversationId = 'conv-123';
    const mockUserId = 'user-123';

    it('should mark conversation as read using RPC', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await apiService.markAsRead(mockConversationId, mockUserId);

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('mark_conversation_as_read', {
        p_conversation_id: mockConversationId,
        p_user_id: mockUserId,
        p_before_timestamp: expect.any(String)
      });
    });

    it('should fallback to direct update when RPC fails', async () => {
      mockSupabaseClient.rpc.mockResolvedValue({
        data: null,
        error: new Error('RPC function not found')
      });

      mockQuery.update.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await apiService.markAsRead(mockConversationId, mockUserId);

      expect(result.error).toBeNull();
      expect(result.data).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_participants');
    });

    it('should validate required parameters', async () => {
      const result = await apiService.markAsRead('', mockUserId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Conversation ID and user ID are required');
    });
  });

  describe('createConversation', () => {
    const mockCreatorId = 'user-123';
    const mockTargetId = 'user-456';

    it('should create direct conversation using RPC', async () => {
      const mockConversationId = 'conv-new';
      
      mockSupabaseClient.rpc.mockResolvedValue({
        data: mockConversationId,
        error: null
      });

      const result = await apiService.createConversation(
        [mockTargetId],
        false,
        mockCreatorId
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(mockConversationId);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_or_create_direct_conversation', {
        user1_id: mockCreatorId,
        user2_id: mockTargetId
      });
    });

    it('should create group conversation manually', async () => {
      const mockConversationId = 'conv-group';
      const groupName = 'Test Group';
      
      mockQuery.single.mockResolvedValue({
        data: { id: mockConversationId },
        error: null
      });

      mockQuery.insert.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await apiService.createConversation(
        [mockTargetId, 'user-789'],
        true,
        mockCreatorId,
        groupName
      );

      expect(result.error).toBeNull();
      expect(result.data).toBe(mockConversationId);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_conversations');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('chat_participants');
    });

    it('should validate required parameters', async () => {
      const result = await apiService.createConversation([], false, mockCreatorId);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('User IDs and creator ID are required');
    });
  });

  describe('getConversationBySlug', () => {
    const mockSlug = 'abc123def456';
    const mockConversations: Conversation[] = [
      {
        conversation_id: 'abc123de-f456-7890-abcd-ef1234567890',
        is_group: false,
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        unread_count: 0,
        participants: []
      }
    ];

    it('should find conversation by slug', async () => {
      const result = await apiService.getConversationBySlug(mockSlug, mockConversations);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.conversation_id).toBe(mockConversations[0].conversation_id);
    });

    it('should return null for invalid slug', async () => {
      const result = await apiService.getConversationBySlug('invalid-slug', mockConversations);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Conversation not found for slug');
    });

    it('should validate required slug parameter', async () => {
      const result = await apiService.getConversationBySlug('', mockConversations);

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error!.message).toBe('Slug is required');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      vi.mocked(getProtectedCurrentUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const result = await apiService.getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(getProtectedCurrentUser).toHaveBeenCalled();
    });

    it('should return null on auth error', async () => {
      vi.mocked(getProtectedCurrentUser).mockRejectedValue(new Error('Auth failed'));

      const result = await apiService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when no user data', async () => {
      vi.mocked(getProtectedCurrentUser).mockResolvedValue({
        data: { user: null },
        error: null
      });

      const result = await apiService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('transformConversationRecord', () => {
    it('should transform conversation record with participants correctly', () => {
      const mockRecord = {
        id: 'conv-123',
        is_group: false,
        name: 'Test Chat',
        created_at: '2024-01-01T00:00:00Z',
        latest_message_content: 'Hello',
        last_message_at: '2024-01-01T00:01:00Z',
        latest_message_sender: 'user-123',
        unread_count: 2,
        participants: [
          {
            user_id: 'user-456',
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        ]
      };

      // Access the private method via any cast for testing
      const result = (apiService as any).transformConversationRecord(mockRecord);

      expect(result.conversation_id).toBe('conv-123');
      expect(result.name).toBe('Test Chat');
      expect(result.last_message).toBe('Hello');
      expect(result.latest_message_content).toBe('Hello');
      expect(result.latest_message_sender).toBe('user-123');
      expect(result.unread_count).toBe(2);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].user_id).toBe('user-456');
      expect(result.participants[0].user.full_name).toBe('John Doe');
      expect(result.participants[0].user.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should transform conversation record with other_participants correctly', () => {
      const mockRecord = {
        conversation_id: 'conv-123',
        is_group: false,
        conversation_name: 'Test Chat',
        created_at: '2024-01-01T00:00:00Z',
        latest_message_content: 'Hello',
        last_message_at: '2024-01-01T00:01:00Z',
        latest_message_sender: 'user-123',
        unread_count: 2,
        other_participants: [
          {
            user_id: 'user-456',
            full_name: 'John Doe',
            avatar_url: 'https://example.com/avatar.jpg'
          }
        ]
      };

      const result = (apiService as any).transformConversationRecord(mockRecord);

      expect(result.conversation_id).toBe('conv-123');
      expect(result.name).toBe('Test Chat');
      expect(result.last_message).toBe('Hello');
      expect(result.latest_message_content).toBe('Hello');
      expect(result.latest_message_sender).toBe('user-123');
      expect(result.unread_count).toBe(2);
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].user_id).toBe('user-456');
      expect(result.participants[0].user.full_name).toBe('John Doe');
      expect(result.participants[0].user.avatar_url).toBe('https://example.com/avatar.jpg');
    });

    it('should handle malformed participants gracefully', () => {
      const mockRecord = {
        conversation_id: 'conv-123',
        is_group: false,
        name: null,
        created_at: '2024-01-01T00:00:00Z',
        latest_message_content: null,
        last_message_at: null,
        unread_count: 0,
        participants: 'invalid-json'
      };

      const result = (apiService as any).transformConversationRecord(mockRecord);

      expect(result.conversation_id).toBe('conv-123');
      expect(result.name).toBeNull();
      expect(result.participants).toEqual([]);
    });

    it('should handle missing fields with defaults', () => {
      const mockRecord = {
        id: 'conv-123'
      };

      const result = (apiService as any).transformConversationRecord(mockRecord);

      expect(result.conversation_id).toBe('conv-123');
      expect(result.name).toBeNull();
      expect(result.is_group).toBe(false);
      expect(result.unread_count).toBe(0);
      expect(result.participants).toEqual([]);
      expect(result.last_message).toBeNull();
      expect(result.latest_message_content).toBeNull();
      expect(result.latest_message_sender).toBeNull();
    });
  });
}); 