import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { useSpaceNotificationPreferences } from '@/hooks/useSpaceNotificationPreferences';
import { 
  SpaceNotificationPreferences, 
  DigestEmailFrequency, 
  NotificationsEmailFrequency 
} from '@/types/notification';
import { log } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface SpaceNotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
  userRole: 'owner' | 'admin' | 'member';
}

interface DropdownSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({ value, options, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="block truncate">
          {options.find(opt => opt.value === value)?.label || value}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                    value === option.value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface ToggleSelectProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const ToggleSelect: React.FC<ToggleSelectProps> = ({ value, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const options = [
    { value: true, label: 'Yes' },
    { value: false, label: 'No' }
  ];

  return (
    <div className="relative">
      <button
        type="button"
        className={`w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="block truncate">
          {value ? 'Yes' : 'No'}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option.value.toString()}
                  type="button"
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100 ${
                    value === option.value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function SpaceNotificationSettingsModal({
  isOpen,
  onClose,
  spaceId,
  spaceName,
  userRole
}: SpaceNotificationSettingsModalProps) {
  const { 
    preferences, 
    effectivePreferences,
    isLoading, 
    error, 
    updatePreference, 
    updateMultiplePreferences 
  } = useSpaceNotificationPreferences(spaceId);

  const [localPreferences, setLocalPreferences] = useState<Partial<SpaceNotificationPreferences>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local preferences when modal opens or preferences load
  useEffect(() => {
    if (isOpen && preferences) {
      setLocalPreferences({
        digest_email_frequency: preferences.digest_email_frequency || 'weekly',
        notifications_email_frequency: preferences.notifications_email_frequency || 'hourly',
        admin_announcements: preferences.admin_announcements ?? true,
        event_reminders: preferences.event_reminders ?? true,
        new_customers: preferences.new_customers ?? (userRole === 'owner' || userRole === 'admin'),
      });
      setHasChanges(false);
    }
  }, [isOpen, preferences, userRole]);

  // Update local state and track changes
  const updateLocalPreference = (key: keyof SpaceNotificationPreferences, value: any) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save preferences
  const handleSave = async () => {
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateMultiplePreferences(localPreferences);
      if (success) {
        toast({
          title: "Settings Saved",
          description: `Notification preferences updated for ${spaceName}.`,
          duration: 3000
        });
        setHasChanges(false);
        onClose();
      }
    } catch (error) {
      log.error('SpaceNotificationSettingsModal', 'Error saving preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel and reset
  const handleCancel = () => {
    if (preferences) {
      setLocalPreferences({
        digest_email_frequency: preferences.digest_email_frequency || 'weekly',
        notifications_email_frequency: preferences.notifications_email_frequency || 'hourly',
        admin_announcements: preferences.admin_announcements ?? true,
        event_reminders: preferences.event_reminders ?? true,
        new_customers: preferences.new_customers ?? (userRole === 'owner' || userRole === 'admin'),
      });
    }
    setHasChanges(false);
    onClose();
  };

  const digestEmailOptions = [
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const notificationsEmailOptions = [
    { value: 'never', label: 'Never' },
    { value: 'immediate', label: 'Immediately' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCancel} />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md bg-white rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {spaceName}
                </h2>
                <h3 className="text-sm font-medium text-gray-600 mt-1">
                  Notification settings
                </h3>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div>
              {/* Digest email frequency */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Digest email frequency
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  A summary of popular posts and member activity when you don't visit the group
                </p>
                <DropdownSelect
                  value={localPreferences.digest_email_frequency || 'weekly'}
                  options={digestEmailOptions}
                  onChange={(value) => updateLocalPreference('digest_email_frequency', value as DigestEmailFrequency)}
                  disabled={isLoading}
                />
              </div>

              {/* Notifications email frequency */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Notifications email frequency
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  A bundled summary of unread likes, comments, mentions and activity for posts/members I follow
                </p>
                <DropdownSelect
                  value={localPreferences.notifications_email_frequency || 'hourly'}
                  options={notificationsEmailOptions}
                  onChange={(value) => updateLocalPreference('notifications_email_frequency', value as NotificationsEmailFrequency)}
                  disabled={isLoading}
                />
              </div>

              {/* Admin announcements */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Admin announcements
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Notify me when group admins make announcement posts
                </p>
                <ToggleSelect
                  value={localPreferences.admin_announcements ?? true}
                  onChange={(value) => updateLocalPreference('admin_announcements', value)}
                  disabled={isLoading}
                />
              </div>

              {/* Event reminders */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Event reminders
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Notify me of calendar events the day before they happen
                </p>
                <ToggleSelect
                  value={localPreferences.event_reminders ?? true}
                  onChange={(value) => updateLocalPreference('event_reminders', value)}
                  disabled={isLoading}
                />
              </div>

              {/* New customer emails - only for owners/admins */}
              {(userRole === 'owner' || userRole === 'admin') && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    New customer emails
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Notify me when my group gets a new customer
                  </p>
                  <ToggleSelect
                    value={localPreferences.new_customers ?? true}
                    onChange={(value) => updateLocalPreference('new_customers', value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ${
                hasChanges && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center">
                  <Check className="w-4 h-4 mr-2" />
                  Save
                </div>
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="px-6 pb-6">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}