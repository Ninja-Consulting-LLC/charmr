import {useState} from 'react';
import {MESSAGES} from '../constants/messages';
import {generateReply} from '../services/api';
import {useStore} from '../store';
import {MessageMode, SubscriptionTier} from '../types/enums';
import {SelectedImage} from '../types/image';
import {logger} from '../utils/logger';
import {Match} from '../utils/matchUtils';

interface UseResponseGeneratorProps {
  images: SelectedImage[];
  selectedMatch: Match | null;
  userPlan: SubscriptionTier;
  onMessageLimitReached: () => void;
  mode: MessageMode;
}

interface UseResponseGeneratorReturn {
  response: string | null;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  generateResponse: (prompt?: string, regenerate?: boolean) => Promise<void>;
  resetResponse: () => void;
}

interface GenerateReplyResponse {
  reply?: string;
  error?: string;
  type?: string;
  limits?: {
    dailyMessagesUsed: number;
    extraMessages: number;
  };
}

export const useResponseGenerator = ({
  images,
  selectedMatch,
  userPlan,
  onMessageLimitReached,
  mode,
}: UseResponseGeneratorProps): UseResponseGeneratorReturn => {
  const {userId, user, setUser} = useStore();
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const resetResponse = () => {
    setResponse(null);
    setError(null);
    setErrorType(null);
  };

  const generateResponse = async (prompt?: string, regenerate?: boolean) => {
    setLoading(true);
    resetResponse();

    logger.app.debug('[ResponseGenerator] Starting response generation', {
      promptLength: prompt?.length,
      imageCount: images?.length,
      selectedMatch: selectedMatch?.name,
      regenerate,
      prompt: regenerate ? prompt : undefined,
    });

    if (images.length === 0 && !prompt?.trim()) {
      logger.app.debug('[ResponseGenerator] No images or prompt provided');
      setError(MESSAGES.NO_IMAGES);
      setErrorType('NO_IMAGES');
      setLoading(false);
      return;
    }

    try {
      logger.app.debug('[ResponseGenerator] Preparing images for upload');
      const base64Images = await Promise.all(
        images.map(async img => {
          try {
            if (img.base64) {
              return img.base64;
            }
            // For local files, fetch and convert to base64
            const response = await fetch(img.path);
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (error) {
            logger.app.error(
              '[ResponseGenerator] Error preparing image:',
              error,
            );
            throw new Error('Failed to prepare image for upload');
          }
        }),
      );

      const result = await generateReply({
        userId,
        matchId: selectedMatch?.id?.toString(),
        prompt: prompt || '',
        images: base64Images,
        mode,
      });

      if (result.error) {
        setError(result.error);
        setErrorType(result.type || null);
        if (result.type === 'MESSAGE_LIMIT') {
          onMessageLimitReached();
        }
      } else {
        setResponse(result.reply || null);

        // Update user state with new message limits after successful response
        if (result.limits) {
          setUser({
            ...user,
            dailyMessagesUsed: result.limits.dailyMessagesUsed,
            extraMessages: result.limits.extraMessages,
          });
          logger.app.debug('[ResponseGenerator] Updated user message limits', {
            dailyMessagesUsed: result.limits.dailyMessagesUsed,
            extraMessages: result.limits.extraMessages,
          });
        }
      }
    } catch (error) {
      logger.app.error('[ResponseGenerator] Error generating response:', error);
      setError(MESSAGES.GENERATION_ERROR);
      setErrorType('GENERATION_ERROR');
    } finally {
      setLoading(false);
    }
  };

  return {
    response,
    loading,
    error,
    errorType,
    generateResponse,
    resetResponse,
  };
};
