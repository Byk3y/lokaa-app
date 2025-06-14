import React from 'react';
import useSpaceSettingsStore from '@/hooks/useSpaceSettingsStore';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FeatureToggleProps {
  id: string;
  label: string;
  description: string;
  isChecked: boolean | undefined;
  onCheckedChange: (isChecked: boolean) => void;
  disabled?: boolean;
}

const FeatureToggle: React.FC<FeatureToggleProps> = ({ id, label, description, isChecked, onCheckedChange, disabled }) => {
  // Ensure isChecked is never undefined for the Switch component
  const currentCheckedState = isChecked === undefined ? true : isChecked; // Default to true if undefined for safety

  return (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-grow">
          <Label htmlFor={id} className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {label}
          </Label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        </div>
        <Switch
          id={id}
          checked={currentCheckedState}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          className="ml-4"
        />
      </div>
    </div>
  );
};

export default function TabsSettingsTab() {
  const { formData, setFormDataField, permissions } = useSpaceSettingsStore();

  // Define features based on the Skool screenshot and assumed formData fields
  const features = [
    {
      id: "classroom",
      label: "Classroom",
      description: "Organize useful information to help your community do whatever they want to do. Some people use this space for guides, instructions, courses, recipes, workout plans, resources, templates, etc.",
      formDataKey: "feature_classroom_enabled" as keyof typeof formData, // Cast for type safety
    },
    {
      id: "calendar",
      label: "Calendar",
      description: "One of the fastest ways to build community is to get members together to hangout live on Zoom, Google Meet, or in-person. Some people use this for coffee hours, Q&As, co-working, happy hour, etc.",
      formDataKey: "feature_calendar_enabled" as keyof typeof formData,
    },
    {
      id: "map", // Assuming a map feature might be desired
      label: "Map",
      description: "Display member locations on a world map to help facilitate in-person meetups.",
      formDataKey: "feature_map_enabled" as keyof typeof formData,
    },
    // Add more features here as needed
  ];

  // Determine if fields should be disabled (e.g., based on permissions or if space data isn't loaded)
  const isDisabled = !permissions?.canEditSpace || !formData;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Tabs</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Show/hide tabs in your community.
        </p>
      </div>

      <div className="space-y-4">
        {features.map(feature => (
          <FeatureToggle
            key={feature.id}
            id={feature.id}
            label={feature.label}
            description={feature.description}
            isChecked={formData[feature.formDataKey] as boolean | undefined}
            onCheckedChange={(isChecked) => setFormDataField(feature.formDataKey, isChecked)}
            disabled={isDisabled}
          />
        ))}
      </div>
    </div>
  );
} 