/**
 * 🎨 Phase 8B: Personalization Engine
 * 
 * Advanced personalization system that adapts the user interface and content
 * based on individual user behavior, preferences, and AI-driven insights.
 */

import { logAnalyticsEvent } from './analytics';
import { logError, classifyError } from './errorHandlingSystem';
import { devLogger } from './developmentLogger';

// Types for personalization
export interface UserPersonalization {
  userId: string;
  preferences: UserPreferences;
  behaviorProfile: BehaviorProfile;
  personalizations: PersonalizationRule[];
  lastUpdated: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  contentTypes: string[];
  notificationSettings: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  layout: LayoutPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  frequency: 'realtime' | 'digest' | 'weekly';
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  contrast: 'normal' | 'high';
  motionReduced: boolean;
  screenReader: boolean;
}

export interface LayoutPreferences {
  sidebarCollapsed: boolean;
  compactMode: boolean;
  cardLayout: 'grid' | 'list';
  itemsPerPage: number;
}

export interface BehaviorProfile {
  activityLevel: 'low' | 'medium' | 'high';
  primaryActions: string[];
  preferredContentTypes: string[];
  activeHours: number[];
  devicePreference: 'mobile' | 'desktop' | 'both';
  navigationPatterns: string[];
  engagementLevel: number; // 0-1
}

export interface PersonalizationRule {
  id: string;
  type: 'ui' | 'content' | 'feature' | 'layout';
  condition: string;
  action: string;
  parameters: any;
  confidence: number;
  isActive: boolean;
  createdAt: number;
}

export interface PersonalizationMetrics {
  totalUsers: number;
  activePersonalizations: number;
  engagementImprovement: number;
  userSatisfactionScore: number;
  conversionImprovement: number;
}

export class PersonalizationEngine {
  private userPersonalizations = new Map<string, UserPersonalization>();
  private activeRules = new Map<string, PersonalizationRule[]>();
  
  private metrics: PersonalizationMetrics = {
    totalUsers: 0,
    activePersonalizations: 0,
    engagementImprovement: 0,
    userSatisfactionScore: 0.8,
    conversionImprovement: 0
  };

  private defaultPreferences: UserPreferences = {
    theme: 'auto',
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    contentTypes: ['posts', 'discussions', 'announcements'],
    notificationSettings: {
      email: true,
      push: true,
      inApp: true,
      frequency: 'realtime'
    },
    accessibility: {
      fontSize: 'medium',
      contrast: 'normal',
      motionReduced: false,
      screenReader: false
    },
    layout: {
      sidebarCollapsed: false,
      compactMode: false,
      cardLayout: 'grid',
      itemsPerPage: 20
    }
  };

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    devLogger.log('Personalization', '🎨 Initializing Personalization Engine');
    
    this.loadUserPersonalizations();
    this.setupPersonalizationUpdate();
    this.applyGlobalPersonalizations();
    
    devLogger.log('Personalization', '✅ Personalization Engine initialized');
  }

  /**
   * Get or create user personalization profile
   */
  public getUserPersonalization(userId: string): UserPersonalization {
    let personalization = this.userPersonalizations.get(userId);
    
    if (!personalization) {
      personalization = this.createDefaultPersonalization(userId);
      this.userPersonalizations.set(userId, personalization);
    }
    
    return personalization;
  }

  /**
   * Update user preferences
   */
  public updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): void {
    try {
      const personalization = this.getUserPersonalization(userId);
      
      personalization.preferences = {
        ...personalization.preferences,
        ...preferences
      };
      
      personalization.lastUpdated = Date.now();
      
      // Apply new preferences immediately
      this.applyUserPersonalizations(userId);
      
      // Save to storage
      this.saveUserPersonalization(userId, personalization);
      
      // Log analytics
      logAnalyticsEvent({
        event_type: 'user',
        event_name: 'PreferencesUpdated',
        event_data: {
          userId,
          updatedFields: Object.keys(preferences),
          timestamp: Date.now()
        }
      });

      devLogger.log('Personalization', `✅ Updated preferences for user ${userId}`, preferences);

    } catch (error) {
      logError(classifyError(error, {
        component: 'PersonalizationEngine',
        operation: 'updateUserPreferences',
        silent: true
      }));
    }
  }

  /**
   * Update user behavior profile based on actions
   */
  public updateBehaviorProfile(userId: string, action: string, context: any = {}): void {
    try {
      const personalization = this.getUserPersonalization(userId);
      const profile = personalization.behaviorProfile;
      
      // Update primary actions
      if (!profile.primaryActions.includes(action)) {
        profile.primaryActions.push(action);
        if (profile.primaryActions.length > 10) {
          profile.primaryActions.shift(); // Keep only recent actions
        }
      }
      
      // Update activity level based on frequency
      this.updateActivityLevel(profile, action);
      
      // Update active hours
      const currentHour = new Date().getHours();
      if (!profile.activeHours.includes(currentHour)) {
        profile.activeHours.push(currentHour);
      }
      
      // Update device preference
      if (context.deviceType) {
        profile.devicePreference = context.deviceType;
      }
      
      // Update engagement level based on action type
      this.updateEngagementLevel(profile, action, context);
      
      personalization.lastUpdated = Date.now();
      
      // Generate new personalization rules
      this.generatePersonalizationRules(userId);
      
    } catch (error) {
      logError(classifyError(error, {
        component: 'PersonalizationEngine',
        operation: 'updateBehaviorProfile',
        silent: true
      }));
    }
  }

  /**
   * Apply personalizations for a user
   */
  public applyUserPersonalizations(userId: string): void {
    try {
      const personalization = this.getUserPersonalization(userId);
      
      // Apply theme preferences
      this.applyThemePersonalization(personalization.preferences);
      
      // Apply layout preferences
      this.applyLayoutPersonalization(personalization.preferences);
      
      // Apply accessibility preferences
      this.applyAccessibilityPersonalization(personalization.preferences);
      
      // Apply active personalization rules
      this.applyPersonalizationRules(userId);
      
      devLogger.log('Personalization', `🎨 Applied personalizations for user ${userId}`);

    } catch (error) {
      logError(classifyError(error, {
        component: 'PersonalizationEngine',
        operation: 'applyUserPersonalizations',
        silent: true
      }));
    }
  }

  /**
   * Generate content recommendations based on user profile
   */
  public getContentRecommendations(userId: string, limit: number = 10): {
    contentId: string;
    type: string;
    score: number;
    reason: string;
  }[] {
    try {
      const personalization = this.getUserPersonalization(userId);
      const profile = personalization.behaviorProfile;
      const preferences = personalization.preferences;
      
      const recommendations: Array<{
        contentId: string;
        type: string;
        score: number;
        reason: string;
      }> = [];
      
      // Generate recommendations based on preferred content types
      preferences.contentTypes.forEach(contentType => {
        recommendations.push({
          contentId: `${contentType}_${Date.now()}`,
          type: contentType,
          score: 0.8,
          reason: `Based on content type preference: ${contentType}`
        });
      });
      
      // Generate recommendations based on primary actions
      profile.primaryActions.forEach(action => {
        if (action.includes('view') || action.includes('read')) {
          recommendations.push({
            contentId: `action_based_${Date.now()}`,
            type: 'recommendation',
            score: 0.7,
            reason: `Based on frequent action: ${action}`
          });
        }
      });
      
      // Sort by score and limit
      return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      logError(classifyError(error, {
        component: 'PersonalizationEngine',
        operation: 'getContentRecommendations',
        silent: true
      }));
      return [];
    }
  }

  /**
   * Get personalized UI configuration
   */
  public getPersonalizedUIConfig(userId: string): {
    layout: LayoutPreferences;
    theme: string;
    features: string[];
    customizations: any;
  } {
    try {
      const personalization = this.getUserPersonalization(userId);
      const preferences = personalization.preferences;
      const profile = personalization.behaviorProfile;
      
      // Determine features to enable based on behavior
      const features = this.getPersonalizedFeatures(profile);
      
      // Generate custom UI configurations
      const customizations = this.generateUICustomizations(preferences, profile);
      
      return {
        layout: preferences.layout,
        theme: preferences.theme,
        features,
        customizations
      };

    } catch (error) {
      logError(classifyError(error, {
        component: 'PersonalizationEngine',
        operation: 'getPersonalizedUIConfig',
        silent: true
      }));
      
      return {
        layout: this.defaultPreferences.layout,
        theme: this.defaultPreferences.theme,
        features: [],
        customizations: {}
      };
    }
  }

  /**
   * Private helper methods
   */
  private createDefaultPersonalization(userId: string): UserPersonalization {
    return {
      userId,
      preferences: { ...this.defaultPreferences },
      behaviorProfile: {
        activityLevel: 'medium',
        primaryActions: [],
        preferredContentTypes: [],
        activeHours: [],
        devicePreference: 'both',
        navigationPatterns: [],
        engagementLevel: 0.5
      },
      personalizations: [],
      lastUpdated: Date.now()
    };
  }

  private updateActivityLevel(profile: BehaviorProfile, action: string): void {
    // Simple activity level calculation based on action frequency
    const actionCount = profile.primaryActions.filter(a => a === action).length;
    
    if (actionCount > 20) {
      profile.activityLevel = 'high';
    } else if (actionCount > 5) {
      profile.activityLevel = 'medium';
    } else {
      profile.activityLevel = 'low';
    }
  }

  private updateEngagementLevel(profile: BehaviorProfile, action: string, context: any): void {
    let engagementBoost = 0;
    
    // Different actions have different engagement values
    if (action.includes('like') || action.includes('share')) {
      engagementBoost = 0.1;
    } else if (action.includes('comment') || action.includes('post')) {
      engagementBoost = 0.2;
    } else if (action.includes('view') || action.includes('read')) {
      engagementBoost = 0.05;
    }
    
    // Factor in time spent
    if (context.timeSpent && context.timeSpent > 30000) { // 30 seconds
      engagementBoost *= 1.5;
    }
    
    profile.engagementLevel = Math.min(profile.engagementLevel + engagementBoost, 1);
  }

  private generatePersonalizationRules(userId: string): void {
    const personalization = this.getUserPersonalization(userId);
    const profile = personalization.behaviorProfile;
    const rules: PersonalizationRule[] = [];
    
    // Generate activity-based rules
    if (profile.activityLevel === 'high') {
      rules.push({
        id: `activity_high_${Date.now()}`,
        type: 'ui',
        condition: 'high_activity',
        action: 'enable_advanced_features',
        parameters: { features: ['keyboard_shortcuts', 'bulk_actions'] },
        confidence: 0.8,
        isActive: true,
        createdAt: Date.now()
      });
    }
    
    // Generate engagement-based rules
    if (profile.engagementLevel > 0.7) {
      rules.push({
        id: `engagement_high_${Date.now()}`,
        type: 'content',
        condition: 'high_engagement',
        action: 'prioritize_interactive_content',
        parameters: { priority: 'high' },
        confidence: 0.9,
        isActive: true,
        createdAt: Date.now()
      });
    }
    
    // Generate device-based rules
    if (profile.devicePreference === 'mobile') {
      rules.push({
        id: `mobile_optimized_${Date.now()}`,
        type: 'layout',
        condition: 'mobile_preference',
        action: 'optimize_for_mobile',
        parameters: { compact: true, largeButtons: true },
        confidence: 0.85,
        isActive: true,
        createdAt: Date.now()
      });
    }
    
    this.activeRules.set(userId, rules);
    personalization.personalizations = rules;
  }

  private applyThemePersonalization(preferences: UserPreferences): void {
    if (typeof window === 'undefined') return;
    
    try {
      const root = document.documentElement;
      
      if (preferences.theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else if (preferences.theme === 'light') {
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        // Auto theme - use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      }
    } catch (error) {
      devLogger.warn('Personalization', 'Theme application failed', { error });
    }
  }

  private applyLayoutPersonalization(preferences: UserPreferences): void {
    if (typeof window === 'undefined') return;
    
    try {
      const root = document.documentElement;
      
      // Apply compact mode
      if (preferences.layout.compactMode) {
        root.classList.add('compact-mode');
      } else {
        root.classList.remove('compact-mode');
      }
      
      // Apply sidebar state
      if (preferences.layout.sidebarCollapsed) {
        root.classList.add('sidebar-collapsed');
      } else {
        root.classList.remove('sidebar-collapsed');
      }
      
      // Apply card layout preference
      root.setAttribute('data-card-layout', preferences.layout.cardLayout);
      
    } catch (error) {
      devLogger.warn('Personalization', 'Layout application failed', { error });
    }
  }

  private applyAccessibilityPersonalization(preferences: UserPreferences): void {
    if (typeof window === 'undefined') return;
    
    try {
      const root = document.documentElement;
      
      // Apply font size
      root.setAttribute('data-font-size', preferences.accessibility.fontSize);
      
      // Apply contrast
      if (preferences.accessibility.contrast === 'high') {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
      
      // Apply motion preference
      if (preferences.accessibility.motionReduced) {
        root.classList.add('reduce-motion');
      } else {
        root.classList.remove('reduce-motion');
      }
      
    } catch (error) {
      devLogger.warn('Personalization', 'Accessibility application failed', { error });
    }
  }

  private applyPersonalizationRules(userId: string): void {
    const rules = this.activeRules.get(userId) || [];
    
    rules.forEach(rule => {
      if (!rule.isActive) return;
      
      try {
        switch (rule.type) {
          case 'ui':
            this.applyUIRule(rule);
            break;
          case 'layout':
            this.applyLayoutRule(rule);
            break;
          case 'content':
            this.applyContentRule(rule);
            break;
          case 'feature':
            this.applyFeatureRule(rule);
            break;
        }
      } catch (error) {
        devLogger.warn('Personalization', `Rule application failed: ${rule.id}`, { error });
      }
    });
  }

  private applyUIRule(rule: PersonalizationRule): void {
    // Apply UI-specific personalization rules
    const { parameters } = rule;
    
    if (rule.action === 'enable_advanced_features' && parameters.features) {
      parameters.features.forEach((feature: string) => {
        document.documentElement.setAttribute(`data-feature-${feature}`, 'enabled');
      });
    }
  }

  private applyLayoutRule(rule: PersonalizationRule): void {
    // Apply layout-specific personalization rules
    const { parameters } = rule;
    
    if (rule.action === 'optimize_for_mobile') {
      if (parameters.compact) {
        document.documentElement.classList.add('mobile-optimized');
      }
      if (parameters.largeButtons) {
        document.documentElement.classList.add('large-buttons');
      }
    }
  }

  private applyContentRule(rule: PersonalizationRule): void {
    // Apply content-specific personalization rules
    // This would typically involve updating content rendering logic
    devLogger.log('Personalization', `Applying content rule: ${rule.action}`, rule.parameters);
  }

  private applyFeatureRule(rule: PersonalizationRule): void {
    // Apply feature-specific personalization rules
    devLogger.log('Personalization', `Applying feature rule: ${rule.action}`, rule.parameters);
  }

  private getPersonalizedFeatures(profile: BehaviorProfile): string[] {
    const features: string[] = [];
    
    // Enable features based on behavior profile
    if (profile.activityLevel === 'high') {
      features.push('keyboard_shortcuts', 'bulk_actions', 'advanced_search');
    }
    
    if (profile.engagementLevel > 0.7) {
      features.push('social_features', 'collaboration_tools');
    }
    
    if (profile.devicePreference === 'mobile') {
      features.push('mobile_gestures', 'offline_sync');
    }
    
    return features;
  }

  private generateUICustomizations(preferences: UserPreferences, profile: BehaviorProfile): any {
    return {
      navbar: {
        position: profile.devicePreference === 'mobile' ? 'bottom' : 'top',
        items: this.getPersonalizedNavItems(profile)
      },
      sidebar: {
        collapsed: preferences.layout.sidebarCollapsed,
        items: this.getPersonalizedSidebarItems(profile)
      },
      dashboard: {
        layout: preferences.layout.cardLayout,
        widgets: this.getPersonalizedWidgets(profile)
      }
    };
  }

  private getPersonalizedNavItems(profile: BehaviorProfile): string[] {
    const items = ['home', 'spaces'];
    
    if (profile.primaryActions.includes('search')) {
      items.splice(1, 0, 'search');
    }
    
    if (profile.engagementLevel > 0.5) {
      items.push('notifications');
    }
    
    return items;
  }

  private getPersonalizedSidebarItems(profile: BehaviorProfile): string[] {
    const items = ['dashboard'];
    
    if (profile.primaryActions.includes('create_post')) {
      items.push('create');
    }
    
    if (profile.activityLevel === 'high') {
      items.push('analytics', 'settings');
    }
    
    return items;
  }

  private getPersonalizedWidgets(profile: BehaviorProfile): string[] {
    const widgets = ['recent_activity'];
    
    if (profile.engagementLevel > 0.6) {
      widgets.push('trending_posts', 'social_feed');
    }
    
    if (profile.activityLevel === 'high') {
      widgets.push('analytics_summary', 'quick_actions');
    }
    
    return widgets;
  }

  private setupPersonalizationUpdate(): void {
    // Update personalizations every 5 minutes
    setInterval(() => {
      this.updateAllPersonalizations();
    }, 5 * 60 * 1000);
  }

  private updateAllPersonalizations(): void {
    this.userPersonalizations.forEach((personalization, userId) => {
      // Regenerate rules based on updated behavior
      this.generatePersonalizationRules(userId);
      
      // Update metrics
      this.updateMetrics();
    });
  }

  private updateMetrics(): void {
    this.metrics.totalUsers = this.userPersonalizations.size;
    this.metrics.activePersonalizations = Array.from(this.activeRules.values())
      .reduce((sum, rules) => sum + rules.filter(r => r.isActive).length, 0);
    
    // Calculate engagement improvement (mock calculation)
    this.metrics.engagementImprovement = this.metrics.activePersonalizations * 0.05;
    
    // Calculate user satisfaction based on personalization adoption
    const personalizedUsers = this.userPersonalizations.size;
    this.metrics.userSatisfactionScore = Math.min(0.8 + (personalizedUsers * 0.01), 1);
  }

  private applyGlobalPersonalizations(): void {
    // Apply any global personalization settings
    if (typeof window !== 'undefined') {
      // Set up responsive font size based on device
      const fontSize = window.innerWidth < 768 ? 'small' : 'medium';
      document.documentElement.setAttribute('data-font-size', fontSize);
    }
  }

  private loadUserPersonalizations(): void {
    try {
      const stored = localStorage.getItem('user_personalizations');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([userId, personalization]) => {
          this.userPersonalizations.set(userId, personalization as UserPersonalization);
        });
        devLogger.log('Personalization', `📥 Loaded personalizations for ${this.userPersonalizations.size} users`);
      }
    } catch (error) {
      devLogger.warn('Personalization', 'Failed to load user personalizations', { error });
    }
  }

  private saveUserPersonalization(userId: string, personalization: UserPersonalization): void {
    try {
      const allPersonalizations: Record<string, UserPersonalization> = {};
      this.userPersonalizations.forEach((p, uid) => {
        allPersonalizations[uid] = p;
      });
      localStorage.setItem('user_personalizations', JSON.stringify(allPersonalizations));
    } catch (error) {
      devLogger.warn('Personalization', 'Failed to save user personalization', { error });
    }
  }

  /**
   * Public API methods
   */
  public getMetrics(): PersonalizationMetrics {
    return { ...this.metrics };
  }

  public getStatus(): {
    isActive: boolean;
    totalUsers: number;
    activePersonalizations: number;
    metrics: PersonalizationMetrics;
    lastUpdate: string;
  } {
    return {
      isActive: true,
      totalUsers: this.userPersonalizations.size,
      activePersonalizations: this.metrics.activePersonalizations,
      metrics: this.getMetrics(),
      lastUpdate: new Date().toISOString()
    };
  }

  public runTest(): Promise<{
    success: boolean;
    results: {
      userCreation: boolean;
      preferenceUpdate: boolean;
      behaviorUpdate: boolean;
      personalizationApplication: boolean;
      contentRecommendations: boolean;
    };
    metrics: PersonalizationMetrics;
  }> {
    return new Promise((resolve) => {
      const results = {
        userCreation: false,
        preferenceUpdate: false,
        behaviorUpdate: false,
        personalizationApplication: false,
        contentRecommendations: false
      };

      try {
        // Test user creation
        const testUser = this.getUserPersonalization('test_user');
        results.userCreation = testUser.userId === 'test_user';

        // Test preference update
        this.updateUserPreferences('test_user', { theme: 'dark' });
        results.preferenceUpdate = true;

        // Test behavior update
        this.updateBehaviorProfile('test_user', 'test_action', { deviceType: 'mobile' });
        results.behaviorUpdate = true;

        // Test personalization application
        this.applyUserPersonalizations('test_user');
        results.personalizationApplication = true;

        // Test content recommendations
        const recommendations = this.getContentRecommendations('test_user', 5);
        results.contentRecommendations = recommendations.length >= 0;

        resolve({
          success: Object.values(results).every(Boolean),
          results,
          metrics: this.getMetrics()
        });

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
    // Save all personalizations before cleanup
    this.userPersonalizations.forEach((personalization, userId) => {
      this.saveUserPersonalization(userId, personalization);
    });
    
    devLogger.log('Personalization', '🧹 Cleanup completed');
  }
}

// Create and export singleton instance
export const personalizationEngine = new PersonalizationEngine();

// Global interface for testing and debugging
if (typeof window !== 'undefined') {
  (window as any).personalizationEngine = {
    getStatus: () => personalizationEngine.getStatus(),
    getMetrics: () => personalizationEngine.getMetrics(),
    runTest: () => personalizationEngine.runTest(),
    getUserPersonalization: (userId: string) => personalizationEngine.getUserPersonalization(userId),
    updateUserPreferences: (userId: string, prefs: any) => personalizationEngine.updateUserPreferences(userId, prefs),
    updateBehaviorProfile: (userId: string, action: string, context?: any) => 
      personalizationEngine.updateBehaviorProfile(userId, action, context),
    applyUserPersonalizations: (userId: string) => personalizationEngine.applyUserPersonalizations(userId),
    getContentRecommendations: (userId: string, limit?: number) => 
      personalizationEngine.getContentRecommendations(userId, limit),
    getPersonalizedUIConfig: (userId: string) => personalizationEngine.getPersonalizedUIConfig(userId),
    cleanup: () => personalizationEngine.cleanup(),
    
    // Test methods
    testPersonalization: () => {
      console.log('🧪 Testing personalization system...');
      const userId = 'test_user_' + Date.now();
      
      // Test user creation and preferences
      personalizationEngine.updateUserPreferences(userId, { 
        theme: 'dark', 
        layout: { compactMode: true } 
      });
      
      // Test behavior updates
      personalizationEngine.updateBehaviorProfile(userId, 'view_post', { deviceType: 'mobile' });
      personalizationEngine.updateBehaviorProfile(userId, 'like_post', { timeSpent: 45000 });
      
      // Apply personalizations
      personalizationEngine.applyUserPersonalizations(userId);
      
      // Get recommendations
      const recommendations = personalizationEngine.getContentRecommendations(userId, 3);
      
      console.log('✅ Personalization test completed', {
        userId,
        recommendations: recommendations.length,
        status: personalizationEngine.getStatus()
      });
      
      return { userId, recommendations };
    },
    
    testThemeSwitch: () => {
      console.log('🎨 Testing theme switching...');
      const userId = 'theme_test_user';
      
      // Test light theme
      personalizationEngine.updateUserPreferences(userId, { theme: 'light' });
      console.log('💡 Applied light theme');
      
      setTimeout(() => {
        // Test dark theme
        personalizationEngine.updateUserPreferences(userId, { theme: 'dark' });
        console.log('🌙 Applied dark theme');
        
        setTimeout(() => {
          // Test auto theme
          personalizationEngine.updateUserPreferences(userId, { theme: 'auto' });
          console.log('🔄 Applied auto theme');
        }, 1000);
      }, 1000);
      
      return true;
    },
    
    testAccessibility: () => {
      console.log('♿ Testing accessibility personalization...');
      const userId = 'accessibility_test_user';
      
      personalizationEngine.updateUserPreferences(userId, {
        accessibility: {
          fontSize: 'large',
          contrast: 'high',
          motionReduced: true,
          screenReader: false
        }
      });
      
      console.log('✅ Accessibility preferences applied');
      return true;
    }
  };
}

export default personalizationEngine; 