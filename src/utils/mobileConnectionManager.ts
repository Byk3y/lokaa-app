// Mobile Connection Manager
// Serializes queries on mobile hard refresh to prevent overwhelming Safari's connection recovery

interface QueuedQuery {
  id: string;
  queryFn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number; // Lower numbers = higher priority
}

class MobileConnectionManager {
  private queryQueue: QueuedQuery[] = [];
  private isProcessing = false;
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly FAILURE_BACKOFF_MS = 2000;

  constructor() {
    console.log('🔧 [MobileConnectionManager] Initialized');
  }

  async executeQuery<T>(
    queryId: string,
    queryFn: () => Promise<T>,
    priority: number = 5
  ): Promise<T> {
    // Check if we should use serialized execution
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     window.innerWidth <= 768;
    const isHardRefresh = performance.navigation?.type === 1 || 
                         (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
    
    if (!isMobile || !isHardRefresh) {
      // Not mobile hard refresh - execute immediately
      console.log('🚀 [MobileConnectionManager] Direct execution for:', queryId);
      return await queryFn();
    }

    // Check if we're in backoff period
    if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.FAILURE_BACKOFF_MS) {
        const waitTime = this.FAILURE_BACKOFF_MS - timeSinceLastFailure;
        console.log(`⏳ [MobileConnectionManager] Backoff active, waiting ${waitTime}ms before queuing:`, queryId);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.log('📱 [MobileConnectionManager] Queuing serialized query:', queryId, 'Priority:', priority);
    
    return new Promise<T>((resolve, reject) => {
      this.queryQueue.push({
        id: queryId,
        queryFn,
        resolve,
        reject,
        priority
      });

      // Sort queue by priority (lower number = higher priority)
      this.queryQueue.sort((a, b) => a.priority - b.priority);
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('⚡ [MobileConnectionManager] Processing queue, length:', this.queryQueue.length);

    while (this.queryQueue.length > 0) {
      const query = this.queryQueue.shift()!;
      
      try {
        console.log('🔄 [MobileConnectionManager] Executing:', query.id);
        const result = await query.queryFn();
        query.resolve(result);
        
        // Reset failure counter on success
        this.consecutiveFailures = 0;
        
        // Add a small delay between queries to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error('❌ [MobileConnectionManager] Query failed:', query.id, error);
        query.reject(error);
        
        this.consecutiveFailures++;
        this.lastFailureTime = Date.now();
        
        // If too many failures, pause queue processing
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
          console.error('🚨 [MobileConnectionManager] Too many failures, pausing queue');
          break;
        }
      }
    }

    this.isProcessing = false;
    console.log('✅ [MobileConnectionManager] Queue processing complete');
  }

  getQueueLength(): number {
    return this.queryQueue.length;
  }

  clearQueue(): void {
    this.queryQueue.forEach(query => {
      query.reject(new Error('Queue cleared'));
    });
    this.queryQueue = [];
    this.isProcessing = false;
    console.log('🗑️ [MobileConnectionManager] Queue cleared');
  }
}

// Global instance
export const mobileConnectionManager = new MobileConnectionManager();

// Debug helper
if (typeof window !== 'undefined') {
  (window as any).mobileConnectionManager = mobileConnectionManager;
} 