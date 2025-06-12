import { PromptVariant } from '../../types';

export const COMMON_SUMMARY_INSTRUCTIONS = `The "summary" field is for internal use only and should:
1. Preserve all important existing information from the current match summary
2. Add any new relevant details from the current message
3. Combine both into a coherent summary
4. If no meaningful changes occurred, keep the existing summary`;

export const COMMON_MESSAGE_INSTRUCTIONS = `The "message" field should contain your actual response that will be sent to the user. This should be a natural, conversational message that the user can directly send to their match. Do not include any analysis, summaries, meta-commentary, or quotes in the message field.`;

export const JSON_RESPONSE_FORMAT = {
  summary: 'Combined summary preserving existing info and adding new details',
  message: 'Your response',
};

export const HOME_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify({
  message: 'Your response',
}, null, 2)}

The message field should contain your actual response that will be sent to the user. Do not include any prefixes like "you could say" or quotes. Do not wrap the response in code blocks or add any explanatory text. Do not include safety disclaimers or requests for more information - just return the JSON object with your suggested message.`;

export const CHAT_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify(JSON_RESPONSE_FORMAT, null, 2)}

The message field should contain your actual response that will be sent to the user.
The summary field should contain a brief summary of the conversation.`;

export const COACH_MODE_FORMAT_INSTRUCTIONS = `Return your response as plain text. Do not wrap it in JSON, markdown, or any other format. Do not use code blocks, bullet points, or any special formatting. When analyzing screenshots, focus on providing specific, actionable advice about the conversation dynamics and communication patterns.`;

export interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
  jsonFormatInstructions?: string;
}

export interface VariantPromptConfig extends BasePromptConfig {}

export interface PromptConfig {
  [key: string]: {
    [key in PromptVariant]: VariantPromptConfig;
  };
}