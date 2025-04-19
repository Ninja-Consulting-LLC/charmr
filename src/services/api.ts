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

export const generateReply = async (
  request: GenerateReplyRequest,
): Promise<GenerateReplyResponse> => {
  try {
    const url = `${config.apiBaseUrl}/api/generate-reply`;
    console.log('Making request to:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (response.status === 429) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || 'Too many requests. Please try again later.',
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating reply:', error);
    throw error;
  }
};
