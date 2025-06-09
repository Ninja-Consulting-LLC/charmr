import { PromptVariant } from '../types';
import { MessageMode } from '../types/enums';

const COMMON_SUMMARY_INSTRUCTIONS = `The "summary" field is for internal use only and should:
1. Preserve all important existing information from the current match summary
2. Add any new relevant details from the current message
3. Combine both into a coherent summary
4. If no meaningful changes occurred, keep the existing summary`;

const COMMON_MESSAGE_INSTRUCTIONS = `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, meta-commentary, or quotes in the message field.`;

const HOME_SCREEN_MESSAGE_INSTRUCTIONS = `Return ONLY the message text itself, without any prefixes like "you could say" or quotes.`;

const JSON_RESPONSE_FORMAT = {
  summary: 'Combined summary preserving existing info and adding new details',
  message: 'Your response',
};

const PLAIN_TEXT_RESPONSE_FORMAT = {
  message: 'Your response',
};

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
      basePrompt: 'You are a dating coach helping the user improve their conversation skills.',
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
        'Consider both parties\' engagement levels',
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

  return `\n\nPlease respond in JSON with two fields: "summary" and "message". Do not include anything else.

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

  // For home screen (no matchId), use different message instructions
  if (!hasMatchId) {
    return `${basePrompt}${guidelines}\n\n${HOME_SCREEN_MESSAGE_INSTRUCTIONS}`;
  }

  const responseFormat =
    mode !== MessageMode.COACH ? formatJsonResponse(config, hasMatchId || false) : '';

  return `${basePrompt}${guidelines}${responseFormat}`;
}
