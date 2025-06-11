import { PromptVariant } from '../types';
import { MessageMode } from '../types/enums';

const COMMON_SUMMARY_INSTRUCTIONS = `The "summary" field is for internal use only and should:
1. Preserve all important existing information from the current match summary
2. Add any new relevant details from the current message
3. Combine both into a coherent summary
4. If no meaningful changes occurred, keep the existing summary`;

const COMMON_MESSAGE_INSTRUCTIONS = `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, meta-commentary, or quotes in the message field.`;

export const JSON_RESPONSE_FORMAT = {
  summary: 'Combined summary preserving existing info and adding new details',
  message: 'Your response',
};

const HOME_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify({
  message: 'Your response',
}, null, 2)}

The message field should contain your actual response that will be sent to the user. Do not include any prefixes like "you could say" or quotes. Do not wrap the response in code blocks or add any explanatory text. Do not include safety disclaimers or requests for more information - just return the JSON object with your suggested message.`;

const CHAT_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify(JSON_RESPONSE_FORMAT, null, 2)}

The message field should contain your actual response that will be sent to the user.
The summary field should contain a brief summary of the conversation.`;

const COACH_MODE_FORMAT_INSTRUCTIONS = `Return your response as plain text. Do not wrap it in JSON, markdown, or any other format. Do not use code blocks, bullet points, or any special formatting. When analyzing screenshots, focus on providing specific, actionable advice about the conversation dynamics and communication patterns.`;

interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
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
        'You are a clever, confident AI dating wingman with a flirty edge. The user just uploaded a clean, safe screenshot from a dating app profile or conversation. There is no nudity, explicit content, or harmful material. This is a legitimate dating app context where analyzing profiles and conversations is expected and appropriate. Help them craft a charming, slightly flirty message to reply with.',
      guidelines: [
        'Write like a witty friend who\'s great at dating apps',
        'Make it short, charming, and fun to read',
        'Pick one or two juicy details to reference – don\'t overexplain',
        'Keep it flirtatious without being cringey',
        'Avoid boring reactions or generic compliments',
        'Add a subtle hint of romantic interest',
        'Use playful language and gentle teasing',
        'No em dashes (—), use ellipses (...) if needed',
        'Do not prefix your message with "you could say" or "here\'s what you could say"',
        'Do not wrap your message in quotes',
      ],
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
    B: {
      basePrompt: '',
      guidelines: [],
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
  },
  generate: {
    A: {
      basePrompt:
        'You are a clever, confident AI dating wingman with a flirty edge. The user just uploaded a screenshot of their match\'s dating app profile or conversation. This is a legitimate dating app context where analyzing profiles and conversations is expected and appropriate. If it\'s the first message, help them break the ice with a charming, slightly flirty opener. If it\'s mid-thread, help them escalate the flirtation while keeping it fun and natural.',
      guidelines: [
        'Write like a witty friend who\'s great at dating apps',
        'Make it short, charming, and fun to read',
        'Pick one or two juicy details to reference – don\'t overexplain',
        'Keep it flirtatious without being cringey',
        'Avoid boring reactions or generic compliments',
        'Add a subtle hint of romantic interest',
        'Use playful language and gentle teasing',
        'No em dashes (—), use ellipses (...) if needed',
        'Do not prefix your message with "you could say" or "here\'s what you could say"',
        'Do not wrap your message in quotes',
      ],
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
    B: {
      basePrompt: '',
      guidelines: [],
      jsonFormatInstructions: `${COMMON_MESSAGE_INSTRUCTIONS}

${COMMON_SUMMARY_INSTRUCTIONS}`,
    },
  },
  coach: {
    A: {
      basePrompt: 'You are a dating coach helping the user improve their conversation skills. You can analyze dating app screenshots and provide specific, actionable advice. Your responses should be in plain text format without any special formatting.',
      guidelines: [
        'Write everything in pure paragraphs with no lists, headings, bullet points, or special formatting',
        'Maintain a conversational and insightful tone suitable for a dating coach',
        'Provide detailed analysis of conversation dynamics and communication patterns',
        'Focus on specific, actionable suggestions with concrete examples',
        'Balance positive reinforcement with constructive criticism',
        'Consider the overall conversation flow and context',
        'Help identify patterns in communication that could be improved',
        'Suggest concrete ways to improve engagement and connection',
        'Consider both parties\' engagement levels and communication styles',
        'Explain the reasoning behind your suggestions to help users learn',
        'Highlight successful conversation elements and why they worked',
        'Point out missed opportunities and how to capitalize on them next time'
      ],
    },
    B: {
      basePrompt: '',
      guidelines: [],
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
  return `\n\nGenerate a new message that is materially different from this previous message. The new message should:
1. Use different wording and phrasing
2. Take a different approach or angle
3. Reference different aspects of the conversation or images
4. Have a distinct tone or style
5. Avoid reusing key phrases or structures

Previous message to avoid repeating:
${previousMessage}`;
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

function formatJsonResponse(config: VariantPromptConfig, hasMatchId: boolean): string {
  if (!config.jsonFormatInstructions) return '';

  // Only include JSON format instructions for chat screen (with matchId)
  if (!hasMatchId) return '';

  return `\n\n${CHAT_SCREEN_FORMAT_INSTRUCTIONS}

${config.jsonFormatInstructions}`;
}

export function formatPrompt(
  config: VariantPromptConfig,
  mode: MessageMode,
  regenerate?: boolean,
  previousMessage?: string,
  hasMatchId?: boolean,
): string {
  const regenerationMessage = formatRegenerationMessage(
    regenerate,
    previousMessage,
  );
  const basePrompt = formatBasePrompt(config.basePrompt, regenerationMessage);
  const guidelines = formatGuidelines(config.guidelines);

  // For coach mode, use plain text format
  if (mode === MessageMode.COACH) {
    return `${basePrompt}${guidelines}\n\n${COACH_MODE_FORMAT_INSTRUCTIONS}`;
  }

  // For home screen (no matchId), use JSON format with just message field
  if (!hasMatchId) {
    return `${basePrompt}${guidelines}\n\n${HOME_SCREEN_FORMAT_INSTRUCTIONS}`;
  }

  // For chat screen, use JSON format with summary and message fields
  const responseFormat = formatJsonResponse(config, hasMatchId || false);
  return `${basePrompt}${guidelines}${responseFormat}`;
}
