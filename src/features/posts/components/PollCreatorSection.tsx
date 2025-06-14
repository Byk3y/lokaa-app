import React from 'react';
import { X } from 'lucide-react';

interface PollOption {
  id: string;
  text: string;
}

interface PollCreatorSectionProps {
  pollOptions: PollOption[];
  onPollOptionChange: (id: string, text: string) => void;
  onRemovePollOption: (id: string) => void;
  onAddPollOption: () => void;
  onRemovePoll: () => void;
}

/**
 * Component for creating poll options
 */
export const PollCreatorSection: React.FC<PollCreatorSectionProps> = ({
  pollOptions,
  onPollOptionChange,
  onRemovePollOption,
  onAddPollOption,
  onRemovePoll
}) => {
  return (
    <div className="my-4 p-4 border border-gray-200 rounded-md dark:border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-md font-semibold text-gray-800 dark:text-gray-200">Poll</h3>
        <button 
          onClick={onRemovePoll}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Remove
        </button>
      </div>

      <div className="space-y-3">
        {pollOptions.map((option, index) => (
          <div key={option.id} className="flex items-center space-x-2">
            <input
              type="text"
              value={option.text}
              onChange={(e) => onPollOptionChange(option.id, e.target.value)}
              placeholder={`Option ${index + 1}`}
              className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-teal-500 focus:border-teal-500"
            />
            {pollOptions.length > 2 && (
              <button 
                onClick={() => onRemovePollOption(option.id)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Remove option"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button 
        onClick={onAddPollOption}
        disabled={pollOptions.length >= 10} // Disable if max options reached
        className="mt-3 text-sm text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Option
      </button>
    </div>
  );
}; 