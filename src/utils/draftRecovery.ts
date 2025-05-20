/**
 * Utilities for saving and recovering post drafts
 */

// Save draft to localStorage
export const savePostDraft = (spaceId: string, title: string, body: string) => {
  try {
    localStorage.setItem('post_draft', JSON.stringify({
      spaceId,
      title,
      body,
      timestamp: Date.now()
    }));
    return true;
  } catch (e) {
    console.error('Error saving draft:', e);
    return false;
  }
};

// Check for and load draft from localStorage
export const loadPostDraft = (spaceId: string) => {
  try {
    const savedDraft = localStorage.getItem('post_draft');
    if (!savedDraft) return null;
    
    const draft = JSON.parse(savedDraft);
    
    // Only return if it's for the same space and less than 24 hours old
    const isSameSpace = draft.spaceId === spaceId;
    const isRecent = Date.now() - draft.timestamp < 24 * 60 * 60 * 1000;
    
    if (isSameSpace && isRecent) {
      return {
        title: draft.title || "",
        body: draft.body || "",
        timestamp: draft.timestamp
      };
    } else {
      // Clear old or irrelevant drafts
      localStorage.removeItem('post_draft');
      return null;
    }
  } catch (e) {
    console.error('Error loading draft:', e);
    return null;
  }
};

// Clear draft from localStorage
export const clearPostDraft = () => {
  try {
    localStorage.removeItem('post_draft');
    return true;
  } catch (e) {
    console.error('Error clearing draft:', e);
    return false;
  }
}; 