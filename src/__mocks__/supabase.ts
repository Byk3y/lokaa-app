
import { vi } from 'vitest';

const eq = vi.fn(() => {
  return {
    eq,
    single,
    order,
  }
});
const single = vi.fn(() => Promise.resolve({ data: null, error: null }));
const order = vi.fn(() => Promise.resolve({ data: [], error: null }));
const insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
const update = vi.fn(() => Promise.resolve({ data: null, error: null }));
const deleteFn = vi.fn(() => Promise.resolve({ data: null, error: null }));

const from = vi.fn(() => ({
  select: vi.fn(() => ({
    eq,
    single,
    order,
  })),
  insert,
  update,
  delete: deleteFn,
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
}));

const mockSupabase = {
  from,
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
  },
};

export const getSupabaseClient = vi.fn(() => mockSupabase);
