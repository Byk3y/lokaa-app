import { lazy } from 'react';
import LoadingIndicator from '@/components/LoadingIndicator';

// Create individual setting section components for better code splitting
export const LazyGeneralSettings = lazy(() => import('./GeneralSettingsTab'));
export const LazyNotificationSettings = lazy(() => import('./NotificationSettingsTab'));
export const LazyPayoutSettings = lazy(() => import('./PayoutSettingsTab'));
export const LazyInviteSettings = lazy(() => import('./InviteSettingsTab'));
export const LazySubscriptionSettings = lazy(() => import('./SubscriptionSettingsTab'));
export const LazyCategorySettings = lazy(() => import('./CategorySettingsTab'));
export const LazyTabSettings = lazy(() => import('./TabSettingsTab'));
export const LazyPluginSettings = lazy(() => import('./PluginSettingsTab'));
export const LazyMetricsSettings = lazy(() => import('./MetricsSettingsTab'));
export const LazyGamificationSettings = lazy(() => import('./GamificationSettingsTab'));
export const LazyDiscoverySettings = lazy(() => import('./DiscoverySettingsTab'));
export const LazyLinksSettings = lazy(() => import('./LinksSettingsTab'));
export const LazyBillingSettings = lazy(() => import('./BillingSettingsTab'));

// Shared loading component for settings tabs
export const SettingsTabLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <LoadingIndicator />
  </div>
);