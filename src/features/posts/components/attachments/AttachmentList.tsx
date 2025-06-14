import React from 'react';
import { Attachment } from '../../types';
import { AttachmentItem } from './AttachmentItem';
import { isImageUrl } from '../../utils';

interface AttachmentListProps {
  attachments: Attachment[];
  onRemoveAttachment: (id: string) => void;
  onVideoClick: (e: React.MouseEvent<HTMLDivElement>, attachment: Attachment) => void;
}

/**
 * Component for displaying a list of attachments, grouped by type
 */
export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onRemoveAttachment,
  onVideoClick
}) => {
  if (attachments.length === 0) {
    return null;
  }

  // Get images, videos, and other attachments
  const imageAttachments = attachments.filter(
    att => att.type === 'file' && (att.fileType?.startsWith('image/') || isImageUrl(att.url))
  );
  
  const videoAttachments = attachments.filter(
    att => att.type === 'video'
  );
  
  const otherAttachments = attachments.filter(
    att => (att.type === 'file' && !att.fileType?.startsWith('image/') && !isImageUrl(att.url)) || 
           att.type === 'link'
  );

  return (
    <div className="mt-4 mb-3 space-y-3">
      {/* Image attachments */}
      {imageAttachments.length > 0 && (
        <div className="space-y-2">
          {imageAttachments.map(attachment => (
            <AttachmentItem 
              key={attachment.id}
              attachment={attachment}
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}

      {/* Video attachments */}
      {videoAttachments.length > 0 && (
        <div className="space-y-2">
          {videoAttachments.map(attachment => (
            <AttachmentItem 
              key={attachment.id}
              attachment={attachment}
              onRemove={onRemoveAttachment}
              onVideoClick={onVideoClick}
            />
          ))}
        </div>
      )}

      {/* Other attachments (files and links) */}
      {otherAttachments.length > 0 && (
        <div className="space-y-2">
          {otherAttachments.map(attachment => (
            <AttachmentItem 
              key={attachment.id}
              attachment={attachment}
              onRemove={onRemoveAttachment}
            />
          ))}
        </div>
      )}
    </div>
  );
}; 