import {PromptVariant} from '../types';
import {MessageMode} from '../types/enums';

const COMMON_SUMMARY_INSTRUCTIONS = `The "summary" field is for internal use only and should:
1. Preserve all important existing information from the current match summary
2. Add any new relevant details from the current message
3. Combine both into a coherent summary
4. If no meaningful changes occurred, keep the existing summary`;

const COMMON_MESSAGE_INSTRUCTIONS = `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, or meta-commentary in the message field.`;

const COMMON_RESPONSE_FORMAT = {
  summary: 'Combined summary preserving existing info and adding new details',
  message: 'Your response',
};

interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
  responseFormat?: {
    summary: string;
    message: string;
  };
  jsonFormatInstructions?: string;
}

interface VariantPromptConfig extends BasePromptConfig {}

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
        'Consider the visual elements and context of the screenshot',
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
        'Look for unique details to reference',
        "Consider the match's interests and personality",
      ],
      responseFormat: COMMON_RESPONSE_FORMAT,
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: COMMON_RESPONSE_FORMAT,
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
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
        "Consider the user's previous messages and conversation flow",
        'Maintain a natural, engaging tone',
        'Keep responses concise but meaningful',
        'Look for unique details to reference',
        "Consider the match's interests and personality",
      ],
      responseFormat: COMMON_RESPONSE_FORMAT,
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
    B: {
      basePrompt: '',
      guidelines: [],
      responseFormat: COMMON_RESPONSE_FORMAT,
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
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

function formatRegenerationMessage(
  regenerate: boolean | undefined,
  previousMessage: string | undefined,
): string {
  if (!regenerate || !previousMessage) return '';
  return `\n\nGenerate a new message that is different from this previous message:\n${previousMessage}`;
}

function formatBasePrompt(
  basePrompt: string,
  regenerationMessage: string,
): string {
  if (!basePrompt) return regenerationMessage;
  return `${basePrompt}${regenerationMessage}`;
}

function formatGuidelines(guidelines: string[]): string {
  if (guidelines.length === 0) return '';
  return `\n\nGuidelines:\n${guidelines
    .map((g, i) => `${i + 1}. ${g}`)
    .join('\n')}`;
}

function formatJsonResponse(config: VariantPromptConfig): string {
  if (!config.jsonFormatInstructions || !config.responseFormat) return '';

  return `\n\nIMPORTANT: You must respond in this exact JSON format:
{
  "summary": "${config.responseFormat?.summary || ''}",
  "message": "${config.responseFormat?.message || ''}"
}

${config.jsonFormatInstructions}`;
}

export function formatPrompt(
  config: VariantPromptConfig,
  mode: MessageMode,
  regenerate?: boolean,
  previousMessage?: string,
): string {
  const regenerationMessage = formatRegenerationMessage(
    regenerate,
    previousMessage,
  );
  const basePrompt = formatBasePrompt(config.basePrompt, regenerationMessage);
  const guidelines = formatGuidelines(config.guidelines);
  const responseFormat =
    mode !== MessageMode.COACH ? formatJsonResponse(config) : '';

  return `${basePrompt}${guidelines}${responseFormat}`;
}
