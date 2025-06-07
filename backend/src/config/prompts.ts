import {PromptVariant} from '../types';
import {MessageMode} from '../types/enums';

interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
  responseFormat: {
    summary: string;
    message: string;
  };
  jsonFormatInstructions?: string;
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
        'Be flirty but tasteful',
        'Reference specific details from the profile or conversation',
      ],
      responseFormat: {
        summary:
          'Detailed summary of the profile content, including specific facts, interests, and conversation context',
        message:
          'A natural, flirty, concise, and conversational message that the user can send to their match',
      },
      jsonFormatInstructions: `The "message" field should contain your actual response that will be sent to the user. This should be a natural, flirty, and conversational message that the user can directly send to their match. Do not include any analysis, summaries, or meta-commentary in the message field.

The "summary" field is for internal use only and should contain a detailed summary of what you see in the screenshot, including specific facts mentioned (e.g., hobbies, interests, personal details), conversation flow, and any notable details from images.`,
      additionalContext: [
        'Consider the visual elements and context of the screenshot',
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
        'Look for unique details to reference',
        "Consider the match's interests and personality",
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: {
        summary: 'Brief summary',
        message: 'Your response',
      },
      jsonFormatInstructions: `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, or meta-commentary in the message field.

The "summary" field is for internal use only and should contain a brief summary of what you see in the screenshot or conversation context.`,
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
        'Be flirty but tasteful',
        'Reference specific details from previous messages',
        'Keep the conversation engaging and natural',
      ],
      responseFormat: {
        summary:
          'Detailed summary of the conversation context, including specific facts, interests, and key points',
        message: 'Your crafted response',
      },
      jsonFormatInstructions: `The "message" field should contain your actual response that will be sent to the user. This should be a natural, flirty, and conversational message that the user can directly send to their match. Do not include any analysis, summaries, or meta-commentary in the message field.

The "summary" field is for internal use only and should contain a detailed summary of the conversation context, including specific facts mentioned (e.g., hobbies, interests, personal details), conversation flow, and any notable details from previous messages.`,
      additionalContext: [
        "Consider the user's previous messages and conversation flow",
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
        'Look for unique details to reference',
        "Consider the match's interests and personality",
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: {
        summary: 'Brief summary',
        message: 'Your response',
      },
      jsonFormatInstructions: `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, or meta-commentary in the message field.

The "summary" field is for internal use only and should contain a brief summary of what you see in the screenshot or conversation context.`,
    },
  },
  coach: {
    A: {
      basePrompt:
        'You are a helpful AI dating coach. Provide feedback and advice about the conversation.',
      guidelines: [
        'Keep your responses laconic - short, crisp, and to the point',
        'Use paragraphs only, with no headings, bullet points, or formatting',
        'Avoid overly verbose or redundant statements',
        'Maintain a conversational and insightful tone suitable for a dating coach, but without fluff or generic advice',
        'Focus on specific, actionable suggestions',
        'Balance positive reinforcement with constructive criticism',
      ],
      responseFormat: {
        summary:
          'Detailed analysis of conversation dynamics, strengths, and areas for improvement',
        message: 'Your coaching feedback',
      },
      additionalContext: [
        'Consider the overall conversation flow and context',
        'Provide specific, actionable suggestions',
        'Balance positive reinforcement with constructive criticism',
        'Focus on natural conversation progression',
        "Consider both parties' engagement levels",
      ],
    },
    B: {
      basePrompt:
        'You are a helpful AI dating coach. Provide feedback and advice about the conversation.',
      guidelines: [
        'Keep your responses laconic - short, crisp, and to the point',
        'Use paragraphs only, with no headings, bullet points, or formatting',
        'Avoid overly verbose or redundant statements',
        'Maintain a conversational and insightful tone suitable for a dating coach, but without fluff or generic advice',
      ],
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
  mode: MessageMode,
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

  // For COACH mode, don't include JSON response format
  const responseFormat =
    mode !== MessageMode.COACH && config.jsonFormatInstructions
      ? `\n\nIMPORTANT: You must respond in this exact JSON format:
{
  "summary": "${config.responseFormat.summary}",
  "message": "${config.responseFormat.message}"
}

${config.jsonFormatInstructions}`
      : '';

  return `${basePrompt}${guidelines}${additionalContext}${responseFormat}`;
}
