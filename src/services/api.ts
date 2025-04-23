import axios from 'axios';
import {config} from '../config/config';
import {getAuthToken} from '../config/firebase';

interface GenerateReplyRequest {
  prompt: string;
  images: string[];
  userId: string;
  matchId: string;
  skipRateLimiting?: boolean;
}

interface MessageLimit {
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
}

interface GenerateReplyResponse {
  reply: string;
  error?: string;
  type?: string;
  limits?: MessageLimit;
}

interface SupportRequest {
  userId: string;
  email: string;
  phone?: string;
  message: string;
  plan: string;
  dailyMessagesUsed: number;
  dailyMessageLimit: number;
  extraMessages: number;
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
    throw error; // Pass through the axios error directly
  }
};

export const testContext = async (): Promise<void> => {
  try {
    console.log(
      'Testing context with URL:',
      `${config.apiBaseUrl}/api/test-context`,
    );
    await api.post('/api/test-context');
  } catch (error) {
    console.error('Error testing context:', error);
    throw error;
  }
};

export const submitSupportRequest = async (
  request: SupportRequest,
  authBypass: boolean = false,
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Only add auth header if not bypassing auth
  if (!authBypass) {
    headers.Authorization = `Bearer ${await getAuthToken()}`;
  } else {
    // Add auth bypass header
    headers['X-Auth-Bypass'] = 'true';
  }

  const response = await fetch(`${config.apiBaseUrl}/api/support`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to submit support request');
  }

  return response.json();
};
