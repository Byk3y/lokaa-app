import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClassroomAuth } from '../useClassroomAuth';
import { createMockUser, createMockSpace } from '../../../components/classroom/__tests__/utils/testUtils';

// Mock the dependencies
vi.mock('@/hooks/useOptimizedAuth', () => ({
  useOptimizedAuth: vi.fn(),
}));

import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

const mockUseOptimizedAuth = useOptimizedAuth as any;

describe('useClassroomAuth', () => {
  const mockSpace = createMockSpace();
  const mockUser = createMockUser();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseOptimizedAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      error: null,
    });
  });

  describe('User Authentication', () => {
    it('should return user when authenticated', () => {
      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.authLoading).toBe(false);
    });

    it('should handle no user', () => {
      mockUseOptimizedAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
      });

      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authLoading).toBe(false);
    });

    it('should handle loading state', () => {
      mockUseOptimizedAuth.mockReturnValue({
        user: null,
        loading: true,
        error: null,
      });

      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      expect(result.current.authLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle auth error', () => {
      mockUseOptimizedAuth.mockReturnValue({
        user: null,
        loading: false,
        error: new Error('Auth failed'),
      });

      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.authLoading).toBe(false);
    });
  });

  describe('Owner Permissions', () => {
    it('should identify space owner correctly', () => {
      const ownerSpace = createMockSpace({ owner_id: mockUser.id });
      
      const { result } = renderHook(() => useClassroomAuth(ownerSpace));

      expect(result.current.permissions.isOwner).toBe(true);
      expect(result.current.permissions.canCreateCourse).toBe(true);
    });

    it('should identify non-owner correctly', () => {
      const nonOwnerSpace = createMockSpace({ owner_id: 'different-user-id' });
      
      const { result } = renderHook(() => useClassroomAuth(nonOwnerSpace));

      expect(result.current.permissions.isOwner).toBe(false);
      expect(result.current.permissions.canCreateCourse).toBe(false);
    });

    it('should handle missing space data', () => {
      const { result } = renderHook(() => useClassroomAuth(null));

      expect(result.current.permissions.isOwner).toBe(false);
      expect(result.current.permissions.canCreateCourse).toBe(false);
    });

    it('should handle space without owner_id', () => {
      const spaceWithoutOwner = createMockSpace({ owner_id: undefined });
      
      const { result } = renderHook(() => useClassroomAuth(spaceWithoutOwner));

      // Should use fallback owner ID
      expect(result.current.permissions.isOwner).toBe(false);
    });
  });

  describe('Permission Combinations', () => {
    it('should grant all permissions to owner', () => {
      const ownerSpace = createMockSpace({ owner_id: mockUser.id });
      
      const { result } = renderHook(() => useClassroomAuth(ownerSpace));

      expect(result.current.permissions.isOwner).toBe(true);
      expect(result.current.permissions.isAdmin).toBe(true);
      expect(result.current.permissions.canCreateCourse).toBe(true);
      expect(result.current.permissions.canEditCourse).toBe(true);
      expect(result.current.permissions.canDeleteCourse).toBe(true);
      expect(result.current.permissions.canManageModules).toBe(true);
      expect(result.current.permissions.canManageLessons).toBe(true);
      expect(result.current.permissions.canViewAnalytics).toBe(true);
    });

    it('should deny permissions to non-owner', () => {
      const nonOwnerSpace = createMockSpace({ owner_id: 'different-user-id' });
      
      const { result } = renderHook(() => useClassroomAuth(nonOwnerSpace));

      expect(result.current.permissions.isOwner).toBe(false);
      expect(result.current.permissions.isAdmin).toBe(false);
      expect(result.current.permissions.canCreateCourse).toBe(false);
      expect(result.current.permissions.canEditCourse).toBe(false);
      expect(result.current.permissions.canDeleteCourse).toBe(false);
      expect(result.current.permissions.canManageModules).toBe(false);
      expect(result.current.permissions.canManageLessons).toBe(false);
      expect(result.current.permissions.canViewAnalytics).toBe(false);
    });

    it('should deny permissions during loading', () => {
      mockUseOptimizedAuth.mockReturnValue({
        user: mockUser,
        loading: true,
        error: null,
      });

      const ownerSpace = createMockSpace({ owner_id: mockUser.id });
      const { result } = renderHook(() => useClassroomAuth(ownerSpace));

      expect(result.current.permissions.canCreateCourse).toBe(false);
      expect(result.current.permissions.canEditCourse).toBe(false);
      expect(result.current.permissions.canDeleteCourse).toBe(false);
    });

    it('should deny permissions without authentication', () => {
      mockUseOptimizedAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
      });

      const ownerSpace = createMockSpace({ owner_id: mockUser.id });
      const { result } = renderHook(() => useClassroomAuth(ownerSpace));

      expect(result.current.permissions.canCreateCourse).toBe(false);
      expect(result.current.permissions.canEditCourse).toBe(false);
      expect(result.current.permissions.canDeleteCourse).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null space parameter', () => {
      const { result } = renderHook(() => useClassroomAuth(null));

      expect(result.current.permissions.isOwner).toBe(false);
      expect(result.current.permissions.canCreateCourse).toBe(false);
    });

    it('should handle undefined space parameter', () => {
      const { result } = renderHook(() => useClassroomAuth(undefined));

      expect(result.current.permissions.isOwner).toBe(false);
      expect(result.current.permissions.canCreateCourse).toBe(false);
    });

    it('should use fallback owner ID when space owner_id is missing', () => {
      const spaceWithoutOwner = createMockSpace({ owner_id: undefined });
      
      const { result } = renderHook(() => useClassroomAuth(spaceWithoutOwner));

      // Should still work but with fallback logic
      expect(result.current.permissions).toBeDefined();
      expect(typeof result.current.permissions.isOwner).toBe('boolean');
    });
  });

  describe('Return Value Structure', () => {
    it('should return all required properties', () => {
      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      const expectedProperties = [
        'user',
        'authLoading',
        'isAuthenticated',
        'permissions',
      ];

      expectedProperties.forEach(prop => {
        expect(result.current).toHaveProperty(prop);
      });
    });

    it('should have correct permissions structure', () => {
      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      const expectedPermissions = [
        'isOwner',
        'isAdmin',
        'canCreateCourse',
        'canEditCourse',
        'canDeleteCourse',
        'canManageModules',
        'canManageLessons',
        'canViewAnalytics',
      ];

      expectedPermissions.forEach(prop => {
        expect(result.current.permissions).toHaveProperty(prop);
        expect(typeof result.current.permissions[prop]).toBe('boolean');
      });
    });

    it('should have correct property types', () => {
      const { result } = renderHook(() => useClassroomAuth(mockSpace));

      expect(typeof result.current.authLoading).toBe('boolean');
      expect(typeof result.current.isAuthenticated).toBe('boolean');
      expect(typeof result.current.permissions).toBe('object');
    });
  });

  describe('Performance', () => {
    it('should memoize permissions when dependencies do not change', () => {
      const { result, rerender } = renderHook(() => useClassroomAuth(mockSpace));

      const firstPermissions = result.current.permissions;
      rerender();
      const secondPermissions = result.current.permissions;

      // Permissions object should be the same reference if memoized correctly
      expect(firstPermissions).toBe(secondPermissions);
    });

    it('should update when auth state changes', () => {
      const { result, rerender } = renderHook(() => useClassroomAuth(mockSpace));

      expect(result.current.isAuthenticated).toBe(true);

      // Change auth state
      mockUseOptimizedAuth.mockReturnValue({
        user: null,
        loading: false,
        error: null,
      });

      rerender();

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should update when space ownership changes', () => {
      const ownerSpace = createMockSpace({ owner_id: mockUser.id });
      const { result, rerender } = renderHook(
        ({ space }) => useClassroomAuth(space),
        { initialProps: { space: ownerSpace } }
      );

      expect(result.current.permissions.isOwner).toBe(true);

      // Change space ownership
      const nonOwnerSpace = createMockSpace({ owner_id: 'different-user-id' });
      rerender({ space: nonOwnerSpace });

      expect(result.current.permissions.isOwner).toBe(false);
    });
  });
}); 