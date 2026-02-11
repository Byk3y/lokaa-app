import React from 'react';
import { Paperclip, Link as LinkIcon, Video as VideoIcon, Smile, BarChart } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { PostFormToolbarProps } from '../types';

const TOOLS = [
  { key: 'attach', icon: Paperclip, label: 'Attach file' },
  { key: 'link', icon: LinkIcon, label: 'Add link' },
  { key: 'video', icon: VideoIcon, label: 'Embed video' },
  { key: 'gif', icon: null, label: 'Add GIF' },
  { key: 'poll', icon: BarChart, label: 'Create poll' },
  { key: 'emoji', icon: Smile, label: 'Add emoji' },
] as const;

/**
 * Compact toolbar — icons only, horizontal row
 */
export const PostFormToolbar: React.FC<PostFormToolbarProps> = ({
  onAttachFile,
  onAddLink,
  onAddVideo,
  onAddGif,
  onTogglePoll,
  onToggleEmoji,
  showPollCreator,
}) => {
  const handlers: Record<string, () => void> = {
    attach: onAttachFile,
    link: onAddLink,
    video: onAddVideo,
    gif: onAddGif,
    poll: onTogglePoll,
    emoji: onToggleEmoji,
  };

  const btnBase =
    'inline-flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:text-teal-600 hover:bg-teal-50 dark:text-gray-300 dark:hover:text-teal-400 dark:hover:bg-teal-900/30 transition-all duration-150';
  const btnActive =
    'inline-flex items-center justify-center h-9 w-9 rounded-lg text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-900/30';

  return (
    <div className="flex items-center gap-0.5">
      {TOOLS.map(({ key, icon: Icon, label }) => {
        const isActive = key === 'poll' && showPollCreator;
        return (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <button
                className={isActive ? btnActive : btnBase}
                onClick={handlers[key]}
                aria-label={label}
              >
                {Icon ? (
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                ) : (
                  <span className="text-xs font-bold tracking-wide">GIF</span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
};