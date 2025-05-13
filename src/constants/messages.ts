export const MESSAGES = {
  RATE_LIMIT:
    "You've reached your daily message limit. Purchase more messages to continue.",
  SCREENSHOT_LIMIT:
    'You can add multiple screenshots to help generate better responses.',
  NO_IMAGES:
    'Please provide either a screenshot or a prompt to generate a reply.',
  MESSAGE_LIMIT:
    'You have reached your daily message limit. Please purchase more messages to continue.',
  MESSAGE_COPIED:
    'Message copied to clipboard! Return to your dating app to paste the message.',
  GENERATION_ERROR: 'Failed to generate reply. Please try again.',
  SELECT_MATCH_REQUIRED:
    'Please select a match to maintain conversation context.',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later.',
  IMAGE_SIZE_TOO_LARGE: 'Image size too large. Please try with smaller images.',
  UNEXPECTED_ERROR: 'An unexpected error occurred. Please try again.',

  // Reply Modal Messages
  REPLY_MODAL_TITLE: 'Generated Response',
  REPLY_MODAL_MODIFY_HINT: "Not quite what you're looking for...modify prompt",
  REPLY_MODAL_DELETE_HINT: 'Delete screenshot(s) when done',
  REPLY_MODAL_MODIFY: 'Modify',
  REPLY_MODAL_DONE: 'Done',
  REPLY_MODAL_COPY: 'Copy',
} as const;
