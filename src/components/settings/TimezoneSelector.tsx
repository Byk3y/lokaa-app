import { log } from '@/utils/logger';
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimezone } from '@/hooks/useTimezone';
import { Button } from '@/components/ui/button';

// Common timezones fallback list
const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Africa/Lagos',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Singapore',
  'America/Chicago',
  'America/Toronto',
  'Pacific/Auckland'
];

export function TimezoneSelector() {
  const { userTimezone, saveTimezone, detectTimezone } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(userTimezone);
  const [timezones, setTimezones] = useState<string[]>([]);
  
  useEffect(() => {
    // Set initial value when userTimezone changes (e.g., after initial load)
    setSelectedTimezone(userTimezone);
  }, [userTimezone]);
  
  useEffect(() => {
    // Get all IANA timezones
    try {
      // Try to get all timezones using modern API if available
      if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
        // @ts-ignore - TypeScript doesn't know about this newer API
        const allTimezones = Intl.supportedValuesOf('timeZone');
        setTimezones(allTimezones.sort());
      } else {
        // Fallback to common timezones
        setTimezones(COMMON_TIMEZONES);
      }
    } catch (error) {
      log.error('Component', 'Error getting timezones:', error);
      // Fallback to common timezones
      setTimezones(COMMON_TIMEZONES);
    }
  }, []);
  
  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    saveTimezone(value);
  };
  
  const handleAutoDetect = () => {
    const detected = detectTimezone();
    setSelectedTimezone(detected);
    saveTimezone(detected);
  };
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Your Timezone</label>
      <div className="space-y-2">
        <Select value={selectedTimezone} onValueChange={handleTimezoneChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {timezones.map(tz => (
              <SelectItem key={tz} value={tz}>
                {tz.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoDetect}
          className="text-xs w-full"
        >
          Auto-detect my timezone
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Your timezone is used to display times and dates in your local time.
      </p>
    </div>
  );
} 