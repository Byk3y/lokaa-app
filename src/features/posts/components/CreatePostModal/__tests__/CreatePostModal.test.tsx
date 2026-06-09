import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePostModal } from '../CreatePostModal';
import { getSupabaseClient } from '@/integrations/supabase/client';

type QueryResult<T> = {
  data: T;
  error: Error | null;
};

type InsertPayload = {
  title: string | null;
  content: string;
  user_id: string;
  space_id: string;
  category_id?: string | null;
  slug: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  icon: string | null;
};

type PostRow = {
  id: string;
  title: string;
  content: string;
  slug: string;
};

type QueryBuilder = {
  select: (columns?: string, options?: { count?: string; head?: boolean }) => QueryBuilder;
  insert: (payload: InsertPayload) => QueryBuilder;
  update: (payload: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder | Promise<{ count: number; error: Error | null }>;
  order: (column: string) => Promise<QueryResult<CategoryRow[]>>;
  single: () => Promise<QueryResult<PostRow | null>>;
};

const insertPost = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  getSupabaseClient: vi.fn(),
}));

const createSupabaseMock = () => {
  const createBuilder = (table: string) => {
    let headCountQuery = false;
    let operation: 'insert' | 'update' | null = null;

    const builder: QueryBuilder = {
      select: vi.fn((_columns?: string, options?: { count?: string; head?: boolean }) => {
        headCountQuery = Boolean(options?.head);
        return builder;
      }),
      insert: vi.fn((payload: InsertPayload) => {
        operation = 'insert';
        insertPost(payload);
        return builder;
      }),
      update: vi.fn(() => {
        operation = 'update';
        return builder;
      }),
      eq: vi.fn(() => {
        if (table === 'posts' && headCountQuery) {
          return Promise.resolve({ count: 1, error: null });
        }

        return builder;
      }),
      order: vi.fn(() => {
        if (table === 'space_categories') {
          return Promise.resolve({
            data: [{ id: 'category-general', name: 'General Discussion', icon: null }],
            error: null,
          });
        }

        return Promise.resolve({ data: [], error: null });
      }),
      single: vi.fn(() => {
        if (table === 'posts' && operation === 'insert') {
          return Promise.resolve({
            data: {
              id: 'post-123',
              title: 'Launch Plan',
              content: 'First milestone is ready.',
              slug: 'launch-plan',
            },
            error: null,
          });
        }

        return Promise.resolve({ data: null, error: null });
      }),
    };

    return builder;
  };

  return {
    from: vi.fn((table: string) => createBuilder(table)),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };
};

describe('CreatePostModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 480,
    });
    vi.mocked(getSupabaseClient).mockReturnValue(
      createSupabaseMock() as unknown as ReturnType<typeof getSupabaseClient>
    );
  });

  it('creates a post from the mobile modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onPostCreated = vi.fn();

    render(
      <CreatePostModal
        isOpen
        onClose={onClose}
        spaceId="space-123"
        currentUserId="user-123"
        spaceName="MVP Space"
        userName="Ada"
        onPostCreated={onPostCreated}
      />
    );

    await user.type(screen.getByPlaceholderText('Post title'), 'Launch Plan');
    await user.type(screen.getByPlaceholderText("What's on your mind?"), 'First milestone is ready.');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(onPostCreated).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    expect(insertPost).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Launch Plan',
        content: 'First milestone is ready.',
        user_id: 'user-123',
        space_id: 'space-123',
        slug: null,
      })
    );
  });
});
