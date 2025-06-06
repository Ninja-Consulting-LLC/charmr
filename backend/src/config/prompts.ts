import {PromptVariant} from '../types';
import {MessageMode} from '../types/enums';

interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
  responseFormat: {
    summary: string;
    message: string;
  };
}

interface VariantPromptConfig extends BasePromptConfig {
  additionalContext?: string[];
}

interface PromptConfig {
  [key: string]: {
    [key in PromptVariant]: VariantPromptConfig;
  };
}

const promptConfigs: PromptConfig = {
  imageOnly: {
    A: {
      basePrompt:
        'You are a helpful AI dating coach. This is a dating app screenshot. The user is replying to the match. If this is the first message, craft a great opener. Otherwise, keep the thread going naturally.',
      guidelines: [
        'Keep it natural and conversational',
        'Focus on one or two things, not everything',
        'No em dashes (—)',
        'Short and charming',
        "Don't be boring",
      ],
      responseFormat: {
        summary: 'Detailed summary of what you see in the screenshot',
        message: 'Your crafted response',
      },
      additionalContext: [
        'Consider the visual elements and context of the screenshot',
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: {
        summary: 'Brief summary',
        message: 'Your response',
      },
    },
  },
  generate: {
    A: {
      basePrompt:
        'You are a helpful AI dating coach. Generate a message for the user based on the conversation history and prompt.',
      guidelines: [
        'Use prior context to maintain flow',
        'No em dashes (—), keep it short and clever',
        "Don't overanalyze — pick one or two hooks max",
      ],
      responseFormat: {
        summary: 'Detailed summary of the conversation context and key points',
        message: 'Your crafted response',
      },
      additionalContext: [
        "Consider the user's previous messages and conversation flow",
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: {
        summary: 'Brief summary',
        message: 'Your response',
      },
    },
  },
  coach: {
    A: {
      basePrompt:
        'You are a helpful AI dating coach. Provide feedback to the user about their chat.',
      guidelines: [
        'Focus on tone, clarity, and engagement',
        "Call out what's working and what isn't",
        'Keep advice short and actionable',
      ],
      responseFormat: {
        summary: 'Detailed feedback summary',
        message: 'Your coaching feedback',
      },
      additionalContext: [
        'Consider the overall conversation flow and context',
        'Provide specific, actionable suggestions',
        'Balance positive reinforcement with constructive criticism',
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: {
        summary: 'Brief feedback summary',
        message: 'Your coaching feedback',
      },
    },
  },
};

export function getPromptConfig(
  mode: MessageMode,
  hasImages: boolean,
  hasText: boolean,
  variant: PromptVariant = 'A',
): VariantPromptConfig {
  // Determine which prompt type to use
  let promptType: keyof PromptConfig;
  if (hasImages && !hasText) {
    promptType = 'imageOnly';
  } else if (mode === MessageMode.COACH) {
    promptType = 'coach';
  } else {
    promptType = 'generate';
  }

  return promptConfigs[promptType][variant];
}

export function formatPrompt(
  config: VariantPromptConfig,
  regenerate?: boolean,
  previousMessage?: string,
): string {
  const regenerationMessage =
    regenerate && previousMessage
      ? `Generate a new message that is different from this previous message:\n${previousMessage}`
      : '';

  const basePrompt = config.basePrompt
    ? `${config.basePrompt}${
        regenerationMessage ? `\n\n${regenerationMessage}` : ''
      }`
    : regenerationMessage;

  const guidelines =
    config.guidelines.length > 0
      ? `\n\nGuidelines:\n${config.guidelines
          .map((g, i) => `${i + 1}. ${g}`)
          .join('\n')}`
      : '';

  const additionalContext = config.additionalContext
    ? `\n\nAdditional Context:\n${config.additionalContext
        .map(c => `- ${c}`)
        .join('\n')}`
    : '';

  const responseFormat = `\n\nRespond in this JSON format:
{
  "summary": "${config.responseFormat.summary}",
  "message": "${config.responseFormat.message}"
}`;

  return `${basePrompt}${guidelines}${additionalContext}${responseFormat}`;
}
