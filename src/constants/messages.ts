export const MESSAGES = {
  RATE_LIMIT:
    "You've used all 5 free messages for today. Upgrade to send more, or try again tomorrow.",
  SCREENSHOT_LIMIT:
    'Add more than one screenshot if you want a stronger reply.',
  NO_IMAGES:
    'Add a screenshot or type a short note so we can draft a reply.',
  MESSAGE_LIMIT:
    "You've hit your daily message limit. Buy more messages to keep going.",
  MESSAGE_COPIED:
    'Copied. Open your dating app and paste when you are ready.',
  GENERATION_ERROR: 'We could not generate a reply. Please try again.',
  SELECT_MATCH_REQUIRED:
    'Pick a match so your coach stays on topic for that chat.',
  TOO_MANY_REQUESTS: 'Too many tries right now. Please wait a bit and try again.',
  IMAGE_SIZE_TOO_LARGE: 'That image is too large. Try a smaller screenshot.',
  UNEXPECTED_ERROR: 'Something went wrong. Please try again.',

  // Reply Modal Messages
  REPLY_MODAL_TITLE: 'Your reply',
  REPLY_MODAL_DELETE_HINT: 'Remove screenshots from your phone when you are done',
  REPLY_MODAL_DONE: 'Done',
  REPLY_MODAL_COPY: 'Copy',
} as const;
