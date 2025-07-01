import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSupabaseClient } from '@/integrations/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

// Using global Supabase mock from vitest setup

describe('Row Level Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Space Posts RLS', () => {
    it('should prevent sneaky row read across users', async () => {
      // Mock admin client for seeding data
      const mockAdminClient = {
        supabaseUrl: 'http://localhost:54321',
        supabaseKey: 'test-key',
        from: vi.fn().mockImplementation((table) => {
          if (table === 'space_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { role: 'admin' },
                        error: null
                      })
                    })
                  })
                })
              })
            };
          }
          return {
            insert: vi.fn().mockResolvedValue({
              data: { id: 'test-post-id' },
              error: null
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'test-post-id',
                    title: 'Test Post',
                    content: 'Secret content',
                    user_id: 'admin-user',
                    space_id: 'test-space'
                  }
                ],
                error: null
              })
            })
          };
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'admin-user',
                aud: 'authenticated',
                role: 'authenticated'
              }
            },
            error: null
          })
        }
      } as unknown as SupabaseClient<Database>;

      // Mock regular user client
      const mockUserClient = {
        supabaseUrl: 'http://localhost:54321',
        supabaseKey: 'test-key',
        from: vi.fn().mockImplementation((table) => {
          if (table === 'space_members') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: null,
                        error: {
                          code: 'PGRST116',
                          message: 'No rows returned by query'
                        }
                      })
                    })
                  })
                })
              })
            };
          }
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: {
                  code: 'PGRST116',
                  message: 'No rows returned by query'
                }
              })
            })
          };
        }),
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'test-user',
                aud: 'authenticated',
                role: 'authenticated'
              }
            },
            error: null
          })
        }
      } as unknown as SupabaseClient<Database>;

      // First use admin client to create post
      vi.mocked(getSupabaseClient).mockReturnValueOnce(mockAdminClient);

      const adminResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Test Post',
          content: 'Secret content',
          space_id: 'test-space'
        })
      });

      expect(adminResponse.status).toBe(200);
      expect(mockAdminClient.from).toHaveBeenCalled();

      // Then try to read as regular user
      vi.mocked(getSupabaseClient).mockReturnValueOnce(mockUserClient);

      const userResponse = await fetch('/api/posts/test-post-id');
      expect(userResponse.status).toBe(404);
      expect(mockUserClient.from).toHaveBeenCalled();
    });
  });
}); 