import {PromptVariant} from '../../types';

export const COMMON_SUMMARY_INSTRUCTIONS = `The "summary" field is for internal use only and should:
1. If there is an existing match summary:
   - Preserve all important existing information
   - Add any new relevant details from the current message
   - Combine both into a coherent summary
   - If no meaningful changes occurred, keep the existing summary
2. If there is no existing match summary:
   - Create a new summary that captures the key details of the conversation
   - Include relevant information about the match and their interests
   - Keep it concise but informative
   - Focus on the most important aspects of the interaction
3. For the current message:
   - Always include the specific topic or theme being discussed (e.g., "discussing physical features", "talking about travel plans")
   - Note any specific details mentioned (e.g., "mentioned interest in photography", "commented on eyes")
   - Capture the tone and style of the interaction
   - Highlight any notable aspects of the current exchange`;

export const COMMON_MESSAGE_INSTRUCTIONS = `The "message" field should contain ONLY the direct message that will be sent to the user. Do not include any analysis, summaries, meta-commentary, or quotes. Do not wrap the message in quotes or add any prefixes like "you could say" or "here's what you could say". The message should be ready to send as-is.`;

export const COMMON_JSON_FORMAT_INSTRUCTIONS = `${COMMON_MESSAGE_INSTRUCTIONS}\n\n${COMMON_SUMMARY_INSTRUCTIONS}`;

export const JSON_RESPONSE_FORMAT = {
  summary: 'Combined summary preserving existing info and adding new details',
  message: 'Your response',
};

export const HOME_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify(
  {
    message: 'Your response',
  },
  null,
  2,
)}

The message field should contain your actual response that will be sent to the user. Do not include any prefixes like "you could say" or quotes. Do not wrap the response in code blocks or add any explanatory text. Do not include safety disclaimers or requests for more information - just return the JSON object with your suggested message.`;

export const CHAT_SCREEN_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
${JSON.stringify(JSON_RESPONSE_FORMAT, null, 2)}`;

export const COACH_MODE_FORMAT_INSTRUCTIONS = `Return a JSON object with exactly this structure:
{
  "summary": "Combined summary preserving existing info and adding new details",
  "message": "Your coaching advice as plain text"
}

The message field should contain your coaching advice as plain text. Do not wrap it in JSON, markdown, or any other format. Do not use code blocks, bullet points, or any special formatting. When analyzing screenshots, focus on providing specific, actionable advice about the conversation dynamics and communication patterns.

${COMMON_SUMMARY_INSTRUCTIONS}`;

export interface BasePromptConfig {
  basePrompt: string;
  guidelines: string[];
  jsonFormatInstructions?: string;
}

export type VariantPromptConfig = BasePromptConfig;

export interface PromptConfig {
  [key: string]: {
    [key in PromptVariant]: VariantPromptConfig;
  };
}
