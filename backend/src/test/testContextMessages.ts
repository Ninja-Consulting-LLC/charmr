import {MessageMode, MessageRole, MessageType} from '../types/enums';

export interface TestMessage {
  role: MessageRole;
  type: MessageType;
  mode: MessageMode;
  used: boolean;
  content: string;
  images?: string[];
}

// A minimal 1x1 pixel light gray PNG image
const MINIMAL_SCREENSHOT =
  "'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='";

export const testContextMessages: TestMessage[] = [
  // Initial user message
  {
    role: MessageRole.USER,
    type: MessageType.TEXT,
    mode: MessageMode.GENERATE,
    used: true,
    content:
      'Hey! I saw you like hiking and photography. What kind of photos do you take?',
  },
  // Assistant's generated response
  {
    role: MessageRole.ASSISTANT,
    type: MessageType.TEXT,
    mode: MessageMode.GENERATE,
    used: true,
    content:
      "I love capturing landscapes and wildlife during my hikes! I'm particularly proud of my sunset shots from Mount Tam. What about you - do you enjoy photography too?",
  },
  // User's screenshot message
  {
    role: MessageRole.USER,
    type: MessageType.IMAGE,
    mode: MessageMode.GENERATE,
    used: true,
    content: "Here's a screenshot of our conversation so far",
    images: [MINIMAL_SCREENSHOT],
  },
  // System's summary of the screenshot
  {
    role: MessageRole.SYSTEM,
    type: MessageType.SUMMARY,
    mode: MessageMode.GENERATE,
    used: true,
    content:
      'The conversation shows a friendly exchange about photography and hiking. The match seems engaged and has shared their interest in landscape and wildlife photography.',
  },
  // Coach's analysis
  {
    role: MessageRole.ASSISTANT,
    type: MessageType.TEXT,
    mode: MessageMode.COACH,
    used: true,
    content:
      "Great start! You've shown genuine interest in their hobbies and created an opportunity for them to share more. Consider asking about their favorite hiking spots or sharing one of your own photos to keep the conversation flowing.",
  },
  // User's follow-up
  {
    role: MessageRole.USER,
    type: MessageType.TEXT,
    mode: MessageMode.GENERATE,
    used: true,
    content:
      "That's awesome! I actually just got back from a hike at Muir Woods. The redwoods there are incredible. Have you been?",
  },
  // Assistant's generated response
  {
    role: MessageRole.ASSISTANT,
    type: MessageType.TEXT,
    mode: MessageMode.GENERATE,
    used: true,
    content:
      "Muir Woods is magical! I love how the sunlight filters through the redwoods. I haven't been in a while though - what was your favorite part of the trail?",
  },
  // Coach's feedback
  {
    role: MessageRole.ASSISTANT,
    type: MessageType.TEXT,
    mode: MessageMode.COACH,
    used: true,
    content:
      "Excellent follow-up! You've shared a personal experience and asked an open-ended question. This creates a natural flow for them to share their own experiences and keeps the conversation engaging.",
  },
];
