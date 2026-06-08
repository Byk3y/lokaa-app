
import { vi } from 'vitest';

const createQueryBuilder = () => {
  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    limit: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return builder;
};

const from = vi.fn(() => createQueryBuilder());

const mockSupabase = {
  from,
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

export const getSupabaseClient = vi.fn(() => mockSupabase);
