import axios from 'axios';
import {config} from '../config/config';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  skipRateLimiting?: boolean;
}

interface GenerateReplyResponse {
  reply: string;
  error?: string;
}

// Create an axios instance with default config
const api = axios.create({
  baseURL: config.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    console.log(
      'Making request to:',
      `${config.apiBaseUrl}/api/generate-reply`,
    );

    const response = await api.post<GenerateReplyResponse>(
      '/api/generate-reply',
      request,
    );

    return response.data;
  } catch (error) {
    console.error('Error generating reply:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        throw new Error(
          error.response.data.error ||
            'Too many requests. Please try again later.',
        );
      }
      throw new Error(error.response?.data?.error || error.message);
    }

    throw error;
  }
};
