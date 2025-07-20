import {PromptVariant} from '../types';
import {MessageMode} from '../types/enums';
import {
  CHAT_SCREEN_FORMAT_INSTRUCTIONS,
  COACH_MODE_FORMAT_INSTRUCTIONS,
  HOME_SCREEN_FORMAT_INSTRUCTIONS,
  PromptConfig,
  VariantPromptConfig,
} from './prompts/promptConstants';
import {
  coachVariantA,
  generateVariantA,
  imageOnlyVariantA,
} from './prompts/variantA';
import {
  coachVariantB,
  generateVariantB,
  imageOnlyVariantB,
} from './prompts/variantB';

const promptConfigs: PromptConfig = {
  imageOnly: {
    A: imageOnlyVariantA,
    B: imageOnlyVariantB,
  },
  generate: {
    A: generateVariantA,
    B: generateVariantB,
  },
  coach: {
    A: coachVariantA,
    B: coachVariantB,
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

function formatJsonResponse(
  config: VariantPromptConfig,
  hasMatchId: boolean,
  mode?: MessageMode,
): string {
  if (!config.jsonFormatInstructions) return '';

  // Only include JSON format instructions for chat screen (with matchId)
  if (!hasMatchId) return '';

  // For coach mode, always include the coach-specific instructions that contain "json"
  if (mode === MessageMode.COACH) {
    return `\n\n${COACH_MODE_FORMAT_INSTRUCTIONS}`;
  }

  // For all other modes (including imageOnly), include the generic instructions and the variant's instructions
  // This ensures the word "json" is always present when using response_format: json_object
  return `\n\n${CHAT_SCREEN_FORMAT_INSTRUCTIONS}\n\n${config.jsonFormatInstructions}`;
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

  // For home screen (no matchId), use JSON format with just message field
  if (!hasMatchId) {
    return `${basePrompt}${guidelines}\n\n${HOME_SCREEN_FORMAT_INSTRUCTIONS}`;
  }

  // For chat screen (with matchId), use JSON format with summary and message fields
  const responseFormat = formatJsonResponse(config, hasMatchId, mode);
  return `${basePrompt}${guidelines}${responseFormat}`;
}
