/**
 * 🔄 Phase 8B: Adaptive Interface Manager
 * 
 * Intelligent interface adaptation system that dynamically adjusts UI elements,
 * layouts, and interactions based on real-time user behavior and context.
 */

import { personalizationEngine } from './personalizationEngine';
import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Types for adaptive interface
export interface InterfaceAdaptation {
  id: string;
  type: 'layout' | 'component' | 'navigation' | 'content' | 'interaction';
  target: string;
  adaptation: AdaptationRule;
  condition: AdaptationCondition;
  priority: number;
  isActive: boolean;
  confidence: number;
  appliedAt: number;
}

export interface AdaptationRule {
  action: string;
  parameters: {
    [key: string]: any;
  };
  duration?: number; // -1 for permanent, 0 for immediate, >0 for temporary
  reversible: boolean;
}

export interface AdaptationCondition {
  trigger: string;
  context: {
    userBehavior?: string[];
    deviceType?: string;
    timeOfDay?: number;
    activityLevel?: string;
    engagementLevel?: number;
    [key: string]: any;
  };
  threshold?: number;
}

export interface AdaptiveMetrics {
  totalAdaptations: number;
  activeAdaptations: number;
  userSatisfactionImprovement: number;
  interactionEfficiencyGain: number;
  adaptationSuccessRate: number;
  averageAdaptationTime: number;
}

export interface ContextualState {
  userId: string;
  currentPage: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  viewportSize: { width: number; height: number };
  networkSpeed: string;
  batteryLevel?: number;
  timeOfDay: number;
  userActivity: UserActivity;
  interfaceState: InterfaceState;
}

export interface UserActivity {
  recentActions: string[];
  clickPattern: 'precise' | 'exploratory' | 'rushed';
  scrollBehavior: 'focused' | 'scanning' | 'deep_reading';
  navigationStyle: 'direct' | 'browsing' | 'searching';
  errorRate: number;
  taskCompletionRate: number;
}

export interface InterfaceState {
  visibleElements: string[];
  focusedElement?: string;
  scrollPosition: number;
  openModals: string[];
  sidebarState: 'open' | 'closed' | 'auto';
  currentTheme: string;
}

export class AdaptiveInterfaceManager {
  private activeAdaptations = new Map<string, InterfaceAdaptation>();
  private adaptationHistory = new Map<string, InterfaceAdaptation[]>();
  private contextualStates = new Map<string, ContextualState>();
  private adaptationRules = new Map<string, AdaptationRule[]>();
  
  private metrics: AdaptiveMetrics = {
    totalAdaptations: 0,
    activeAdaptations: 0,
    userSatisfactionImprovement: 0,
    interactionEfficiencyGain: 0,
    adaptationSuccessRate: 0.85,
    averageAdaptationTime: 150 // milliseconds
  };

  private isActive = true;
  private adaptationThreshold = 0.7;
  private maxActiveAdaptations = 10;
  private observationInterval = 2000; // 2 seconds

  /**
   * Essential UI elements that should never be hidden
   */
  private readonly protectedElements = [
    'header',
    'navigation', 
    'space-name',
    'user-avatar',
    'main-navigation',
    'breadcrumbs',
    'primary-actions',
    'logo',
    'space-title',
    'space-info'
  ];

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    devLogger.log('AdaptiveInterface', '🔄 Initializing Adaptive Interface Manager');
    
    if (typeof window !== 'undefined') {
      this.setupContextObservation();
      this.setupAdaptationRules();
      this.startAdaptationEngine();
    }
    
    devLogger.log('AdaptiveInterface', '✅ Adaptive Interface Manager initialized');
  }

  /**
   * Update contextual state for a user
   */
  public updateContextualState(userId: string, updates: Partial<ContextualState>): void {
    try {
      const existingState = this.contextualStates.get(userId);
      const newState = existingState ? { ...existingState, ...updates } : this.createDefaultContextualState(userId);
      
      this.contextualStates.set(userId, newState);
      
      // Trigger adaptation analysis
      this.analyzeAndAdapt(userId);
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'updateContextualState',
        silent: true
      }));
    }
  }

  /**
   * Record user interaction for adaptation analysis
   */
  public recordInteraction(userId: string, interaction: {
    type: string;
    target: string;
    success: boolean;
    duration: number;
    context: any;
  }): void {
    try {
      const state = this.contextualStates.get(userId) || this.createDefaultContextualState(userId);
      
      // Update user activity
      state.userActivity.recentActions.push(interaction.type);
      if (state.userActivity.recentActions.length > 20) {
        state.userActivity.recentActions.shift();
      }
      
      // Update click pattern analysis
      this.updateClickPattern(state.userActivity, interaction);
      
      // Update task completion rate
      if (interaction.success) {
        state.userActivity.taskCompletionRate = Math.min(
          state.userActivity.taskCompletionRate + 0.05, 
          1
        );
      } else {
        state.userActivity.errorRate = Math.min(
          state.userActivity.errorRate + 0.02, 
          1
        );
      }
      
      this.contextualStates.set(userId, state);
      
      // Log analytics
      logAnalyticsEvent({
        event_type: 'ui',
        event_name: 'InteractionRecorded',
        event_data: {
          userId,
          interactionType: interaction.type,
          success: interaction.success,
          duration: interaction.duration
        }
      });
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'recordInteraction',
        silent: true
      }));
    }
  }

  /**
   * Analyze context and apply adaptations
   */
  public analyzeAndAdapt(userId: string): void {
    if (!this.isActive) return;
    
    try {
      const state = this.contextualStates.get(userId);
      if (!state) return;
      
      // Generate potential adaptations
      const potentialAdaptations = this.generateAdaptations(state);
      
      // Filter by confidence threshold
      const viableAdaptations = potentialAdaptations.filter(
        adaptation => adaptation.confidence >= this.adaptationThreshold
      );
      
      // Apply high-priority adaptations
      viableAdaptations
        .sort((a, b) => b.priority - a.priority)
        .slice(0, this.maxActiveAdaptations)
        .forEach(adaptation => {
          this.applyAdaptation(adaptation);
        });
        
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'analyzeAndAdapt',
        silent: true
      }));
    }
  }

  /**
   * Generate potential adaptations based on context
   */
  private generateAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Layout adaptations based on device and viewport
    adaptations.push(...this.generateLayoutAdaptations(state));
    
    // Navigation adaptations based on user behavior
    adaptations.push(...this.generateNavigationAdaptations(state));
    
    // Component adaptations based on interaction patterns
    adaptations.push(...this.generateComponentAdaptations(state));
    
    // Content adaptations based on engagement
    adaptations.push(...this.generateContentAdaptations(state));
    
    // Interaction adaptations based on user performance
    adaptations.push(...this.generateInteractionAdaptations(state));
    
    return adaptations;
  }

  /**
   * Generate layout adaptations
   */
  private generateLayoutAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Mobile-specific adaptations
    if (state.deviceType === 'mobile') {
      // Collapse sidebar on mobile for more content space
      if (state.interfaceState.sidebarState === 'open') {
        adaptations.push({
          id: `mobile_sidebar_${Date.now()}`,
          type: 'layout',
          target: 'sidebar',
          adaptation: {
            action: 'collapse',
            parameters: { reason: 'mobile_optimization' },
            duration: -1,
            reversible: true
          },
          condition: {
            trigger: 'mobile_device',
            context: { deviceType: 'mobile' }
          },
          priority: 8,
          isActive: false,
          confidence: 0.9,
          appliedAt: 0
        });
      }
      
      // Enable bottom navigation for mobile
      adaptations.push({
        id: `mobile_bottom_nav_${Date.now()}`,
        type: 'navigation',
        target: 'primary_navigation',
        adaptation: {
          action: 'move_to_bottom',
          parameters: { sticky: true },
          duration: -1,
          reversible: true
        },
        condition: {
          trigger: 'mobile_navigation_optimization',
          context: { deviceType: 'mobile' }
        },
        priority: 7,
        isActive: false,
        confidence: 0.85,
        appliedAt: 0
      });
    }
    
    // Small viewport adaptations
    if (state.viewportSize.width < 768) {
      adaptations.push({
        id: `compact_layout_${Date.now()}`,
        type: 'layout',
        target: 'main_container',
        adaptation: {
          action: 'enable_compact_mode',
          parameters: { spacing: 'reduced', fontSize: 'small' },
          duration: -1,
          reversible: true
        },
        condition: {
          trigger: 'small_viewport',
          context: { viewportWidth: state.viewportSize.width }
        },
        priority: 6,
        isActive: false,
        confidence: 0.8,
        appliedAt: 0
      });
    }
    
    return adaptations;
  }

  /**
   * Generate navigation adaptations
   */
  private generateNavigationAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Frequent actions should be more accessible
    const frequentActions = this.getFrequentActions(state.userActivity.recentActions);
    
    frequentActions.forEach(action => {
      adaptations.push({
        id: `quick_access_${action}_${Date.now()}`,
        type: 'navigation',
        target: 'quick_actions',
        adaptation: {
          action: 'add_quick_access',
          parameters: { actionType: action, position: 'prominent' },
          duration: 24 * 60 * 60 * 1000, // 24 hours
          reversible: true
        },
        condition: {
          trigger: 'frequent_action',
          context: { action },
          threshold: 5 // Minimum occurrences
        },
        priority: 5,
        isActive: false,
        confidence: 0.75,
        appliedAt: 0
      });
    });
    
    // Searching behavior adaptations
    if (state.userActivity.navigationStyle === 'searching') {
      adaptations.push({
        id: `enhanced_search_${Date.now()}`,
        type: 'component',
        target: 'search_interface',
        adaptation: {
          action: 'enhance_search',
          parameters: { 
            showFilters: true, 
            enableAutoComplete: true,
            expandSearchBox: true 
          },
          duration: 30 * 60 * 1000, // 30 minutes
          reversible: true
        },
        condition: {
          trigger: 'search_behavior',
          context: { navigationStyle: 'searching' }
        },
        priority: 7,
        isActive: false,
        confidence: 0.8,
        appliedAt: 0
      });
    }
    
    return adaptations;
  }

  /**
   * Generate component adaptations
   */
  private generateComponentAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Error-prone users get more guidance
    if (state.userActivity.errorRate > 0.3) {
      adaptations.push({
        id: `error_guidance_${Date.now()}`,
        type: 'component',
        target: 'form_fields',
        adaptation: {
          action: 'add_guidance',
          parameters: { 
            showHelp: true, 
            enableValidation: 'realtime',
            showExamples: true 
          },
          duration: 60 * 60 * 1000, // 1 hour
          reversible: true
        },
        condition: {
          trigger: 'high_error_rate',
          context: { errorRate: state.userActivity.errorRate },
          threshold: 0.3
        },
        priority: 9,
        isActive: false,
        confidence: 0.9,
        appliedAt: 0
      });
    }
    
    // Rushed users get simplified interfaces
    if (state.userActivity.clickPattern === 'rushed') {
      adaptations.push({
        id: `simplified_interface_${Date.now()}`,
        type: 'component',
        target: 'action_buttons',
        adaptation: {
          action: 'simplify_interface',
          parameters: { 
            largerButtons: true, 
            reduceOptions: true,
            emphasizePrimary: true 
          },
          duration: 15 * 60 * 1000, // 15 minutes
          reversible: true
        },
        condition: {
          trigger: 'rushed_behavior',
          context: { clickPattern: 'rushed' }
        },
        priority: 6,
        isActive: false,
        confidence: 0.7,
        appliedAt: 0
      });
    }
    
    return adaptations;
  }

  /**
   * Generate content adaptations
   */
  private generateContentAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Deep readers get expanded content view
    if (state.userActivity.scrollBehavior === 'deep_reading') {
      adaptations.push({
        id: `reading_mode_${Date.now()}`,
        type: 'content',
        target: 'content_display',
        adaptation: {
          action: 'enable_reading_mode',
          parameters: { 
            widerContent: true, 
            largerText: true,
            removeDistractions: true 
          },
          duration: 45 * 60 * 1000, // 45 minutes
          reversible: true
        },
        condition: {
          trigger: 'deep_reading',
          context: { scrollBehavior: 'deep_reading' }
        },
        priority: 5,
        isActive: false,
        confidence: 0.8,
        appliedAt: 0
      });
    }
    
    // Scanning users get summary view
    if (state.userActivity.scrollBehavior === 'scanning') {
      adaptations.push({
        id: `summary_view_${Date.now()}`,
        type: 'content',
        target: 'content_cards',
        adaptation: {
          action: 'enable_summary_view',
          parameters: { 
            showSummaries: true, 
            compactCards: true,
            quickActions: true 
          },
          duration: 20 * 60 * 1000, // 20 minutes
          reversible: true
        },
        condition: {
          trigger: 'scanning_behavior',
          context: { scrollBehavior: 'scanning' }
        },
        priority: 6,
        isActive: false,
        confidence: 0.75,
        appliedAt: 0
      });
    }
    
    return adaptations;
  }

  /**
   * Generate interaction adaptations
   */
  private generateInteractionAdaptations(state: ContextualState): InterfaceAdaptation[] {
    const adaptations: InterfaceAdaptation[] = [];
    
    // Low battery optimization
    if (state.batteryLevel && state.batteryLevel < 0.2) {
      adaptations.push({
        id: `battery_optimization_${Date.now()}`,
        type: 'interaction',
        target: 'global_interface',
        adaptation: {
          action: 'optimize_for_battery',
          parameters: { 
            reduceAnimations: true, 
            simplifyEffects: true,
            enableDarkMode: true 
          },
          duration: 60 * 60 * 1000, // 1 hour
          reversible: true
        },
        condition: {
          trigger: 'low_battery',
          context: { batteryLevel: state.batteryLevel },
          threshold: 0.2
        },
        priority: 8,
        isActive: false,
        confidence: 0.95,
        appliedAt: 0
      });
    }
    
    // Slow network optimization
    if (state.networkSpeed === 'slow-2g' || state.networkSpeed === '2g') {
      adaptations.push({
        id: `network_optimization_${Date.now()}`,
        type: 'interaction',
        target: 'data_loading',
        adaptation: {
          action: 'optimize_for_slow_network',
          parameters: { 
            lazyLoadImages: true, 
            reduceImageQuality: true,
            enableOfflineMode: true 
          },
          duration: 30 * 60 * 1000, // 30 minutes
          reversible: true
        },
        condition: {
          trigger: 'slow_network',
          context: { networkSpeed: state.networkSpeed }
        },
        priority: 9,
        isActive: false,
        confidence: 0.9,
        appliedAt: 0
      });
    }
    
    return adaptations;
  }

  /**
   * Apply an adaptation to the interface
   */
  private applyAdaptation(adaptation: InterfaceAdaptation): void {
    try {
      // Check if similar adaptation is already active
      const existingAdaptation = Array.from(this.activeAdaptations.values())
        .find(a => a.target === adaptation.target && a.adaptation.action === adaptation.adaptation.action);
      
      if (existingAdaptation) {
        // Update existing adaptation instead of creating new one
        existingAdaptation.confidence = Math.max(existingAdaptation.confidence, adaptation.confidence);
        return;
      }
      
      // Apply the adaptation
      this.executeAdaptation(adaptation);
      
      // Mark as active
      adaptation.isActive = true;
      adaptation.appliedAt = Date.now();
      this.activeAdaptations.set(adaptation.id, adaptation);
      
      // Schedule cleanup if temporary
      if (adaptation.adaptation.duration && adaptation.adaptation.duration > 0) {
        setTimeout(() => {
          this.removeAdaptation(adaptation.id);
        }, adaptation.adaptation.duration);
      }
      
      // Update metrics
      this.metrics.totalAdaptations++;
      this.metrics.activeAdaptations = this.activeAdaptations.size;
      
      // Log analytics
      logAnalyticsEvent({
        event_type: 'system',
        event_name: 'AdaptationApplied',
        event_data: {
          adaptationId: adaptation.id,
          type: adaptation.type,
          action: adaptation.adaptation.action,
          confidence: adaptation.confidence
        }
      });
      
      devLogger.log('AdaptiveInterface', `🔄 Applied adaptation: ${adaptation.adaptation.action}`, {
        target: adaptation.target,
        confidence: adaptation.confidence
      });
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'applyAdaptation',
        silent: true
      }));
    }
  }

  /**
   * Execute the actual adaptation changes
   */
  private executeAdaptation(adaptation: InterfaceAdaptation): void {
    if (typeof window === 'undefined') return;
    
    const { target, adaptation: rule } = adaptation;
    const { action, parameters } = rule;
    
    try {
      switch (adaptation.type) {
        case 'layout':
          this.executeLayoutAdaptation(target, action, parameters);
          break;
        case 'navigation':
          this.executeNavigationAdaptation(target, action, parameters);
          break;
        case 'component':
          this.executeComponentAdaptation(target, action, parameters);
          break;
        case 'content':
          this.executeContentAdaptation(target, action, parameters);
          break;
        case 'interaction':
          this.executeInteractionAdaptation(target, action, parameters);
          break;
      }
    } catch (error) {
      devLogger.warn('AdaptiveInterface', `Adaptation execution failed: ${action}`, { error });
    }
  }

  private executeLayoutAdaptation(target: string, action: string, parameters: any): void {
    // Check if target is protected
    if (this.isProtectedElement(target)) {
      devLogger.warn('AdaptiveInterface', `⚠️ Skipping adaptation for protected element: ${target}`);
      return;
    }
    
    const root = document.documentElement;
    
    switch (action) {
      case 'collapse':
        if (target === 'sidebar') {
          root.classList.add('sidebar-collapsed');
          root.setAttribute('data-adaptive-sidebar', 'collapsed');
        }
        break;
      case 'enable_compact_mode':
        root.classList.add('compact-mode');
        root.setAttribute('data-adaptive-layout', 'compact');
        break;
    }
  }

  private executeNavigationAdaptation(target: string, action: string, parameters: any): void {
    switch (action) {
      case 'move_to_bottom':
        if (target === 'primary_navigation') {
          document.documentElement.setAttribute('data-adaptive-nav', 'bottom');
        }
        break;
      case 'add_quick_access':
        // This would integrate with the actual quick actions component
        document.documentElement.setAttribute('data-adaptive-quick-access', parameters.actionType);
        break;
    }
  }

  private executeComponentAdaptation(target: string, action: string, parameters: any): void {
    switch (action) {
      case 'add_guidance':
        document.documentElement.setAttribute('data-adaptive-guidance', 'enabled');
        break;
      case 'simplify_interface':
        document.documentElement.classList.add('simplified-interface');
        if (parameters.largerButtons) {
          document.documentElement.setAttribute('data-adaptive-buttons', 'large');
        }
        break;
      case 'enhance_search':
        document.documentElement.setAttribute('data-adaptive-search', 'enhanced');
        break;
    }
  }

  private executeContentAdaptation(target: string, action: string, parameters: any): void {
    switch (action) {
      case 'enable_reading_mode':
        document.documentElement.classList.add('reading-mode');
        document.documentElement.setAttribute('data-adaptive-content', 'reading');
        break;
      case 'enable_summary_view':
        document.documentElement.setAttribute('data-adaptive-content', 'summary');
        break;
    }
  }

  private executeInteractionAdaptation(target: string, action: string, parameters: any): void {
    switch (action) {
      case 'optimize_for_battery':
        document.documentElement.classList.add('battery-optimization');
        if (parameters.reduceAnimations) {
          document.documentElement.classList.add('reduce-motion');
        }
        break;
      case 'optimize_for_slow_network':
        document.documentElement.setAttribute('data-adaptive-network', 'optimized');
        break;
    }
  }

  /**
   * Remove an adaptation
   */
  public removeAdaptation(adaptationId: string): void {
    try {
      const adaptation = this.activeAdaptations.get(adaptationId);
      if (!adaptation || !adaptation.adaptation.reversible) return;
      
      // Reverse the adaptation
      this.reverseAdaptation(adaptation);
      
      // Remove from active adaptations
      this.activeAdaptations.delete(adaptationId);
      
      // Update metrics
      this.metrics.activeAdaptations = this.activeAdaptations.size;
      
      devLogger.log('AdaptiveInterface', `🔄 Removed adaptation: ${adaptation.adaptation.action}`);
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'removeAdaptation',
        silent: true
      }));
    }
  }

  private reverseAdaptation(adaptation: InterfaceAdaptation): void {
    if (typeof window === 'undefined') return;
    
    const { adaptation: rule } = adaptation;
    const { action } = rule;
    
    // Remove adaptive attributes and classes
    const root = document.documentElement;
    
    switch (action) {
      case 'collapse':
        root.classList.remove('sidebar-collapsed');
        root.removeAttribute('data-adaptive-sidebar');
        break;
      case 'enable_compact_mode':
        root.classList.remove('compact-mode');
        root.removeAttribute('data-adaptive-layout');
        break;
      case 'move_to_bottom':
        root.removeAttribute('data-adaptive-nav');
        break;
      case 'add_guidance':
        root.removeAttribute('data-adaptive-guidance');
        break;
      case 'simplify_interface':
        root.classList.remove('simplified-interface');
        root.removeAttribute('data-adaptive-buttons');
        break;
      case 'enable_reading_mode':
        root.classList.remove('reading-mode');
        root.removeAttribute('data-adaptive-content');
        break;
      case 'optimize_for_battery':
        root.classList.remove('battery-optimization', 'reduce-motion');
        break;
      case 'optimize_for_slow_network':
        root.removeAttribute('data-adaptive-network');
        break;
    }
  }

  /**
   * Helper methods
   */
  private createDefaultContextualState(userId: string): ContextualState {
    return {
      userId,
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
      deviceType: this.getDeviceType(),
      viewportSize: typeof window !== 'undefined' 
        ? { width: window.innerWidth, height: window.innerHeight }
        : { width: 1200, height: 800 },
      networkSpeed: this.getNetworkSpeed(),
      timeOfDay: new Date().getHours(),
      userActivity: {
        recentActions: [],
        clickPattern: 'precise',
        scrollBehavior: 'focused',
        navigationStyle: 'direct',
        errorRate: 0,
        taskCompletionRate: 1
      },
      interfaceState: {
        visibleElements: [],
        scrollPosition: 0,
        openModals: [],
        sidebarState: 'open',
        currentTheme: 'auto'
      }
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getNetworkSpeed(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    return (navigator as any).connection?.effectiveType || 'unknown';
  }

  private updateClickPattern(activity: UserActivity, interaction: any): void {
    // Analyze interaction timing and accuracy to determine click pattern
    if (interaction.duration < 100) {
      activity.clickPattern = 'rushed';
    } else if (interaction.duration > 1000) {
      activity.clickPattern = 'exploratory';
    } else {
      activity.clickPattern = 'precise';
    }
  }

  private getFrequentActions(actions: string[]): string[] {
    // Safely handle null/undefined actions array
    if (!actions || !Array.isArray(actions) || actions.length === 0) {
      return [];
    }
    
    const actionCounts = new Map<string, number>();
    
    actions.forEach(action => {
      if (action && typeof action === 'string') {
        actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
      }
    });
    
    return Array.from(actionCounts.entries())
      .filter(([, count]) => count >= 3)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([action]) => action);
  }

  /**
   * Setup methods
   */
  private setupContextObservation(): void {
    // Observe viewport changes
    window.addEventListener('resize', () => {
      if (this.contextualStates && this.contextualStates.size > 0) {
        this.contextualStates.forEach((state, userId) => {
          if (state && userId) {
            state.viewportSize = {
              width: window.innerWidth,
              height: window.innerHeight
            };
            this.updateContextualState(userId, { viewportSize: state.viewportSize });
          }
        });
      }
    });

    // Observe battery changes
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          if (this.contextualStates && this.contextualStates.size > 0) {
            this.contextualStates.forEach((state, userId) => {
              if (state && userId && battery && typeof battery.level === 'number') {
                this.updateContextualState(userId, { batteryLevel: battery.level });
              }
            });
          }
        };
        
        battery.addEventListener('levelchange', updateBattery);
        updateBattery();
      }).catch((error: any) => {
        devLogger.warn('AdaptiveInterface', 'Battery API not available', { error });
      });
    }

    // Observe network changes
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateNetwork = () => {
        if (this.contextualStates && this.contextualStates.size > 0 && connection && connection.effectiveType) {
          this.contextualStates.forEach((state, userId) => {
            if (state && userId) {
              this.updateContextualState(userId, { networkSpeed: connection.effectiveType });
            }
          });
        }
      };
      
      connection.addEventListener('change', updateNetwork);
      updateNetwork();
    }
  }

  private setupAdaptationRules(): void {
    // Load predefined adaptation rules
    // This would typically come from configuration or be learned over time
    devLogger.log('AdaptiveInterface', '📋 Adaptation rules loaded');
  }

  private startAdaptationEngine(): void {
    // Continuously analyze and adapt every few seconds
    setInterval(() => {
      try {
        // Safely iterate over contextual states
        if (this.contextualStates && this.contextualStates.size > 0) {
          this.contextualStates.forEach((state, userId) => {
            if (state && userId && this.isActive) {
              try {
                this.analyzeAndAdapt(userId);
              } catch (error) {
                devLogger.warn('AdaptiveInterface', `Analysis failed for user ${userId}`, { error });
              }
            }
          });
        }
      } catch (error) {
        devLogger.warn('AdaptiveInterface', 'Adaptation engine iteration failed', { error });
      }
    }, this.observationInterval);
    
    devLogger.log('AdaptiveInterface', '🎯 Adaptation engine started');
  }

  /**
   * Public API methods
   */
  public getMetrics(): AdaptiveMetrics {
    return { ...this.metrics };
  }

  public getActiveAdaptations(): InterfaceAdaptation[] {
    return Array.from(this.activeAdaptations.values());
  }

  public getContextualState(userId: string): ContextualState | undefined {
    return this.contextualStates.get(userId);
  }

  public setAdaptationThreshold(threshold: number): void {
    this.adaptationThreshold = Math.max(0, Math.min(1, threshold));
    devLogger.log('AdaptiveInterface', `🎚️ Adaptation threshold set to ${threshold}`);
  }

  public toggleAdaptiveInterface(enabled: boolean): void {
    this.isActive = enabled;
    
    if (!enabled) {
      // Remove all active adaptations
      this.activeAdaptations.forEach((_, id) => {
        this.removeAdaptation(id);
      });
    }
    
    devLogger.log('AdaptiveInterface', `🔄 Adaptive interface ${enabled ? 'enabled' : 'disabled'}`);
  }

  public getStatus(): {
    isActive: boolean;
    totalUsers: number;
    activeAdaptations: number;
    adaptationThreshold: number;
    metrics: AdaptiveMetrics;
    lastUpdate: string;
  } {
    return {
      isActive: this.isActive,
      totalUsers: this.contextualStates.size,
      activeAdaptations: this.activeAdaptations.size,
      adaptationThreshold: this.adaptationThreshold,
      metrics: this.getMetrics(),
      lastUpdate: new Date().toISOString()
    };
  }

  public runTest(): Promise<{
    success: boolean;
    results: {
      contextTracking: boolean;
      adaptationGeneration: boolean;
      adaptationApplication: boolean;
      adaptationRemoval: boolean;
    };
    metrics: AdaptiveMetrics;
  }> {
    return new Promise((resolve) => {
      const results = {
        contextTracking: false,
        adaptationGeneration: false,
        adaptationApplication: false,
        adaptationRemoval: false
      };

      try {
        // Test context tracking
        this.updateContextualState('test_user', {
          deviceType: 'mobile',
          userActivity: { clickPattern: 'rushed' } as any
        });
        results.contextTracking = true;

        // Test adaptation generation
        this.analyzeAndAdapt('test_user');
        results.adaptationGeneration = true;

        // Test adaptation application
        const testAdaptation: InterfaceAdaptation = {
          id: 'test_adaptation',
          type: 'layout',
          target: 'test_target',
          adaptation: {
            action: 'test_action',
            parameters: {},
            reversible: true
          },
          condition: { trigger: 'test', context: {} },
          priority: 5,
          isActive: false,
          confidence: 0.8,
          appliedAt: 0
        };
        
        this.applyAdaptation(testAdaptation);
        results.adaptationApplication = true;

        // Test adaptation removal
        setTimeout(() => {
          this.removeAdaptation('test_adaptation');
          results.adaptationRemoval = true;
          
          resolve({
            success: Object.values(results).every(Boolean),
            results,
            metrics: this.getMetrics()
          });
        }, 100);

      } catch (error) {
        resolve({
          success: false,
          results,
          metrics: this.getMetrics()
        });
      }
    });
  }

  public cleanup(): void {
    // Remove all active adaptations
    this.activeAdaptations.forEach((_, id) => {
      this.removeAdaptation(id);
    });
    
    // Clear contextual states
    this.contextualStates.clear();
    
    devLogger.log('AdaptiveInterface', '🧹 Cleanup completed');
  }

  /**
   * Reset all adaptations and restore default interface
   */
  public resetAllAdaptations(): { success: boolean; message: string; [key: string]: any } {
    try {
      devLogger.log('AdaptiveInterface', '🔄 Starting comprehensive interface reset...');
      
      const root = document.documentElement;
      const body = document.body;
      
      // Remove all adaptive classes from root and body
      const adaptiveClasses = [
        'sidebar-collapsed',
        'compact-mode', 
        'simplified-interface',
        'reading-mode',
        'battery-optimization',
        'reduce-motion',
        'mobile-optimized',
        'adaptive-layout',
        'reduced-ui',
        'minimal-nav',
        'hidden-elements'
      ];
      
      adaptiveClasses.forEach(className => {
        root.classList.remove(className);
        body.classList.remove(className);
      });
      
      // Remove all adaptive attributes
      const adaptiveAttributes = [
        'data-adaptive-sidebar',
        'data-adaptive-layout',
        'data-adaptive-nav',
        'data-adaptive-quick-access',
        'data-adaptive-guidance',
        'data-adaptive-buttons',
        'data-adaptive-search',
        'data-adaptive-content',
        'data-adaptive-network',
        'data-adaptive-hidden',
        'data-adaptive-visibility'
      ];
      
      adaptiveAttributes.forEach(attr => {
        root.removeAttribute(attr);
        body.removeAttribute(attr);
      });
      
      // CRITICAL: Restore visibility of protected elements
      this.protectedElements.forEach(elementIdentifier => {
        const elements = document.querySelectorAll(`[class*="${elementIdentifier}"], [id*="${elementIdentifier}"], .${elementIdentifier}, #${elementIdentifier}`);
        elements.forEach(element => {
          // Remove hidden/invisible classes
          element.classList.remove('hidden', 'invisible', 'opacity-0', 'scale-0', 'h-0', 'w-0');
          
          // Reset inline styles that might hide elements
          const htmlElement = element as HTMLElement;
          htmlElement.style.display = '';
          htmlElement.style.visibility = '';
          htmlElement.style.opacity = '';
          htmlElement.style.transform = '';
          htmlElement.style.height = '';
          htmlElement.style.width = '';
          
          // Remove adaptive attributes from individual elements
          adaptiveAttributes.forEach(attr => {
            element.removeAttribute(attr);
          });
        });
      });
      
      // Special handling for space name/title elements
      const spaceNameSelectors = [
        '[data-testid="space-name"]',
        '.space-name',
        '.space-title', 
        '#space-name',
        '#space-title',
        '[class*="space-name"]',
        '[class*="space-title"]',
        'h1[class*="space"]',
        'h2[class*="space"]'
      ];
      
      spaceNameSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const htmlElement = element as HTMLElement;
          htmlElement.style.display = '';
          htmlElement.style.visibility = 'visible';
          htmlElement.style.opacity = '1';
          htmlElement.classList.remove('hidden', 'invisible', 'opacity-0');
          
          devLogger.log('AdaptiveInterface', `🔍 Restored visibility for space element: ${selector}`);
        });
      });
      
      // Clear all active adaptations
      this.activeAdaptations.clear();
      this.metrics.activeAdaptations = 0;
      
      // Clear contextual states to prevent immediate re-adaptation
      this.contextualStates.clear();
      
      devLogger.log('AdaptiveInterface', '✅ Comprehensive reset completed - all adaptations removed and protected elements restored');
      
      return {
        success: true,
        message: 'Interface restored to default state',
        restoredElements: this.protectedElements.length,
        clearedAdaptations: this.activeAdaptations.size
      };
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'AdaptiveInterfaceManager',
        operation: 'resetAllAdaptations',
        silent: false
      }));
      
      return {
        success: false,
        message: 'Reset failed - check console for errors',
        error: error.message
      };
    }
  }

  /**
   * Check if an element is protected from adaptation
   */
  private isProtectedElement(element: string): boolean {
    return this.protectedElements.some(protectedEl => 
      element.toLowerCase().includes(protectedEl) || 
      protectedEl.includes(element.toLowerCase())
    );
  }
}

// Create and export singleton instance
export const adaptiveInterfaceManager = new AdaptiveInterfaceManager();

// Global interface for testing and debugging
if (typeof window !== 'undefined') {
  (window as any).adaptiveInterfaceManager = {
    getStatus: () => adaptiveInterfaceManager.getStatus(),
    getMetrics: () => adaptiveInterfaceManager.getMetrics(),
    runTest: () => adaptiveInterfaceManager.runTest(),
    updateContextualState: (userId: string, updates: any) => 
      adaptiveInterfaceManager.updateContextualState(userId, updates),
    recordInteraction: (userId: string, interaction: any) => 
      adaptiveInterfaceManager.recordInteraction(userId, interaction),
    analyzeAndAdapt: (userId: string) => adaptiveInterfaceManager.analyzeAndAdapt(userId),
    getActiveAdaptations: () => adaptiveInterfaceManager.getActiveAdaptations(),
    getContextualState: (userId: string) => adaptiveInterfaceManager.getContextualState(userId),
    removeAdaptation: (id: string) => adaptiveInterfaceManager.removeAdaptation(id),
    setAdaptationThreshold: (threshold: number) => adaptiveInterfaceManager.setAdaptationThreshold(threshold),
    toggleAdaptiveInterface: (enabled: boolean) => adaptiveInterfaceManager.toggleAdaptiveInterface(enabled),
    cleanup: () => adaptiveInterfaceManager.cleanup(),
    
    // Test methods
    testMobileAdaptation: () => {
      console.log('📱 Testing mobile adaptation...');
      const userId = 'mobile_test_user';
      
      // Simulate mobile context
      adaptiveInterfaceManager.updateContextualState(userId, {
        deviceType: 'mobile',
        viewportSize: { width: 375, height: 667 }
      });
      
      // Trigger adaptation
      adaptiveInterfaceManager.analyzeAndAdapt(userId);
      
      console.log('✅ Mobile adaptation test completed');
      return adaptiveInterfaceManager.getActiveAdaptations();
    },
    
    testBehaviorAdaptation: () => {
      console.log('🧠 Testing behavior-based adaptation...');
      const userId = 'behavior_test_user';
      
      // Simulate rushed behavior
      adaptiveInterfaceManager.recordInteraction(userId, {
        type: 'click',
        target: 'button',
        success: false,
        duration: 50,
        context: {}
      });
      
      // Simulate error-prone behavior
      for (let i = 0; i < 5; i++) {
        adaptiveInterfaceManager.recordInteraction(userId, {
          type: 'form_submit',
          target: 'form',
          success: false,
          duration: 200,
          context: {}
        });
      }
      
      console.log('✅ Behavior adaptation test completed');
      return adaptiveInterfaceManager.getActiveAdaptations();
    },
    
    testPerformanceAdaptation: () => {
      console.log('⚡ Testing performance adaptation...');
      const userId = 'performance_test_user';
      
      // Simulate low battery
      adaptiveInterfaceManager.updateContextualState(userId, {
        batteryLevel: 0.15,
        networkSpeed: 'slow-2g'
      });
      
      console.log('✅ Performance adaptation test completed');
      return adaptiveInterfaceManager.getActiveAdaptations();
    }
  };
}

export default adaptiveInterfaceManager; 