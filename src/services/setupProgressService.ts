import { getSupabaseClient } from '@/integrations/supabase/client';
import { Database } from '@/types/database.types';

type UserSpaceProgress = Database['public']['Tables']['user_space_progress']['Row'];
type TaskType = 'invite' | 'description' | 'cover' | 'post';

// Tasks that are completed once for the entire space (any admin can complete them)
const SPACE_LEVEL_TASKS: TaskType[] = ['description', 'cover', 'post', 'invite'];

// Tasks that are completed per-user (each user must complete individually)
const USER_LEVEL_TASKS: TaskType[] = [];

export interface SetupProgressData {
  tasks: Record<TaskType, boolean>;
  setupDismissed: boolean;
  lastUpdated: string | null;
}

export interface TaskProgress {
  taskType: TaskType;
  completed: boolean;
  completedAt: string | null;
}

export class SetupProgressService {
  private static supabase = getSupabaseClient();

  /**
   * Check if setup guide should be shown for a user in a space
   * Returns true if any tasks are incomplete or setup hasn't been dismissed
   */
  static async shouldShowSetupGuide(userId: string, spaceId: string): Promise<boolean> {
    const progress = await this.getSetupProgress(userId, spaceId);
    
    // If setup was dismissed, don't show guide
    if (progress.setupDismissed) {
      return false;
    }

    // Show guide if any tasks are incomplete
    return !Object.values(progress.tasks).every(completed => completed);
  }

  /**
   * Get all setup progress for a user in a specific space
   * 
   * NOTE: This method distinguishes between:
   * - Space-level tasks: Completed once for the entire space by ANY admin/owner
   * - User-level tasks: Must be completed individually by each user
   * 
   * Currently all tasks are treated as space-level tasks.
   */
  static async getSetupProgress(userId: string, spaceId: string): Promise<SetupProgressData> {
    // Get user-specific progress
    const { data: userData, error: userError } = await this.supabase
      .from('user_space_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('space_id', spaceId);

    if (userError) {
      console.error('[SetupProgressService] Error fetching user setup progress:', userError);
      throw userError;
    }

    // Get space-level progress (completed by ANY user in the space)
    const { data: spaceData, error: spaceError } = await this.supabase
      .from('user_space_progress')
      .select('*')
      .eq('space_id', spaceId)
      .not('completed_at', 'is', null);

    if (spaceError) {
      console.error('[SetupProgressService] Error fetching space setup progress:', spaceError);
      throw spaceError;
    }

    // Transform database rows into a more usable format
    const tasks: Record<TaskType, boolean> = {
      invite: false,
      description: false,
      cover: false,
      post: false
    };

    let setupDismissed = false;
    let lastUpdated: string | null = null;

    // Check user-level tasks first
    userData?.forEach((row: UserSpaceProgress) => {
      if (USER_LEVEL_TASKS.includes(row.task_type)) {
        tasks[row.task_type] = row.completed_at !== null;
      }
      if (row.setup_dismissed) {
        setupDismissed = true;
      }
      if (row.updated_at && (!lastUpdated || row.updated_at > lastUpdated)) {
        lastUpdated = row.updated_at;
      }
    });

    // Check space-level tasks (completed by ANY user)
    const completedSpaceTasks = new Set<TaskType>();
    spaceData?.forEach((row: UserSpaceProgress) => {
      if (SPACE_LEVEL_TASKS.includes(row.task_type) && row.completed_at !== null) {
        completedSpaceTasks.add(row.task_type);
      }
    });

    // Apply space-level completions
    SPACE_LEVEL_TASKS.forEach(taskType => {
      if (completedSpaceTasks.has(taskType)) {
        tasks[taskType] = true;
      }
    });

    return {
      tasks,
      setupDismissed,
      lastUpdated
    };
  }

  /**
   * Update completion status for a specific task
   */
  static async updateTaskCompletion(
    userId: string, 
    spaceId: string, 
    taskType: TaskType, 
    completed: boolean
  ): Promise<void> {
    const completedAt = completed ? new Date().toISOString() : null;
    
    const { error } = await this.supabase
      .from('user_space_progress')
      .upsert({
        user_id: userId,
        space_id: spaceId,
        task_type: taskType,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,space_id,task_type'
      });

    if (error) {
      console.error(`[SetupProgressService] Error updating task completion for ${taskType}:`, error);
      throw error;
    }
  }

  /**
   * Mark the setup guide as dismissed for a user in a space
   */
  static async dismissSetupGuide(userId: string, spaceId: string): Promise<void> {
    // Create or update a special record for setup dismissal
    const { error } = await this.supabase
      .from('user_space_progress')
      .upsert({
        user_id: userId,
        space_id: spaceId,
        task_type: 'invite', // Use invite as the primary task type for dismissal tracking
        setup_dismissed: true,
        setup_dismissed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,space_id,task_type'
      });

    if (error) {
      console.error('Error dismissing setup guide:', error);
      throw error;
    }
  }

  /**
   * Check if a specific task is completed
   */
  static async getTaskCompletion(
    userId: string, 
    spaceId: string, 
    taskType: TaskType
  ): Promise<boolean> {
    // For space-level tasks, check if ANY user in the space has completed it
    if (SPACE_LEVEL_TASKS.includes(taskType)) {
      const { data, error } = await this.supabase
        .from('user_space_progress')
        .select('completed_at')
        .eq('space_id', spaceId)
        .eq('task_type', taskType)
        .not('completed_at', 'is', null)
        .limit(1);

      if (error) {
        console.error(`Error checking space-level task completion for ${taskType}:`, error);
        throw error;
      }

      return data && data.length > 0;
    }

    // For user-level tasks, check specific user completion
    const { data, error } = await this.supabase
      .from('user_space_progress')
      .select('completed_at')
      .eq('user_id', userId)
      .eq('space_id', spaceId)
      .eq('task_type', taskType)
      .single();

    if (error) {
      // If no record exists, task is not completed
      if (error.code === 'PGRST116') {
        return false;
      }
      console.error(`Error checking user-level task completion for ${taskType}:`, error);
      throw error;
    }

    return data?.completed_at !== null;
  }

  /**
   * Migrate existing localStorage data to database
   */
  static async migrateFromLocalStorage(userId: string, spaceId: string): Promise<void> {
    try {
      // Check for existing localStorage data
      const inviteCompleted = localStorage.getItem(`invite-task-completed-${spaceId}`) === 'true';
      const setupDismissed = localStorage.getItem(`setup-dismissed-${spaceId}`) === 'true';

      if (inviteCompleted || setupDismissed) {
        // Create migration records
        const updates = [];

        if (inviteCompleted) {
          updates.push(this.updateTaskCompletion(userId, spaceId, 'invite', true));
        }

        if (setupDismissed) {
          updates.push(this.dismissSetupGuide(userId, spaceId));
        }

        await Promise.all(updates);

        // Clean up localStorage after successful migration
        localStorage.removeItem(`invite-task-completed-${spaceId}`);
        localStorage.removeItem(`setup-dismissed-${spaceId}`);
        
        console.log('Successfully migrated setup progress from localStorage to database');
      }
    } catch (error) {
      console.error('Error migrating setup progress from localStorage:', error);
      // Don't throw - migration should be non-blocking
    }
  }

  /**
   * Reset all setup progress for a user in a space (useful for testing)
   */
  static async resetSetupProgress(userId: string, spaceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_space_progress')
      .delete()
      .eq('user_id', userId)
      .eq('space_id', spaceId);

    if (error) {
      console.error('Error resetting setup progress:', error);
      throw error;
    }
  }

  /**
   * Batch update multiple tasks at once
   */
  static async batchUpdateTasks(
    userId: string, 
    spaceId: string, 
    tasks: Partial<Record<TaskType, boolean>>
  ): Promise<void> {
    const updates = Object.entries(tasks).map(([taskType, completed]) => 
      this.updateTaskCompletion(userId, spaceId, taskType as TaskType, completed)
    );

    await Promise.all(updates);
  }
}