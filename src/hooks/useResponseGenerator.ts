import {useState} from 'react';
import {MESSAGES} from '../constants/messages';
import {generateReply} from '../services/api';
import {useStore} from '../store';
import {MessageMode, SubscriptionTier} from '../types/enums';
import {SelectedImage} from '../types/image';
import {User} from '../types/user';
import {compressImages} from '../utils/imageCompression';
import {logger} from '../utils/logger';
import {generateMatchId, Match} from '../utils/matchUtils';

interface UseResponseGeneratorProps {
  images: SelectedImage[];
  selectedMatch: Match | null;
  userPlan: SubscriptionTier;
  onMessageLimitReached?: () => void;
  mode: MessageMode;
}

interface UseResponseGeneratorReturn {
  response: string | null;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  generateResponse: (prompt?: string) => Promise<void>;
  resetResponse: () => void;
}

export const useResponseGenerator = ({
  images,
  selectedMatch,
  userPlan,
  onMessageLimitReached,
  mode,
}: UseResponseGeneratorProps): UseResponseGeneratorReturn => {
  const {userId, setUser} = useStore();
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const resetResponse = () => {
    setResponse(null);
    setError(null);
    setErrorType(null);
  };

  const generateResponse = async (prompt?: string) => {
    setLoading(true);
    resetResponse();

    logger.app.info('[ResponseGenerator] Starting response generation', {
      promptLength: prompt?.length,
      imageCount: images?.length,
      selectedMatch: selectedMatch?.name,
    });

    if (images.length === 0 && !prompt?.trim()) {
      logger.app.info('[ResponseGenerator] No images or prompt provided');
      setError(MESSAGES.NO_IMAGES);
      setErrorType('NO_IMAGES');
      setLoading(false);
      return;
    }

    try {
      logger.app.info('[ResponseGenerator] Converting images to base64');
      const base64Images = await Promise.all(
        images.map(async (img, index) => {
          try {
            if (img.base64) {
              logger.app.info(
                `[ResponseGenerator] Using existing base64 for image ${index}`,
              );
              return img.base64;
            }
            logger.app.info(
              `[ResponseGenerator] Converting image ${index} to base64`,
            );
            const compressedImage = await compressImages([img.path]);
            return compressedImage[0].base64;
          } catch (error) {
            logger.app.error(
              `[ResponseGenerator] Error converting image ${index}:`,
              error,
            );
            throw new Error('Failed to process images. Please try again.');
          }
        }),
      );

      logger.app.info('[ResponseGenerator] Calling generateReply API');
      const reply = await generateReply({
        prompt: prompt?.trim() || '',
        images: base64Images,
        userId,
        matchId: selectedMatch ? generateMatchId(selectedMatch) : undefined,
        deleteAfterResponse: images.length > 0,
        mode,
      });

      logger.app.info('[ResponseGenerator] Received API response:', {
        hasReply: !!reply.reply,
        hasError: !!reply.error,
        errorType: reply.type,
      });

      if (reply.error) {
        logger.app.info('[ResponseGenerator] Setting error state:', {
          error: reply.error,
          type: reply.type,
        });
        if (reply.type === 'MESSAGE_LIMIT') {
          onMessageLimitReached?.();
          setError(null);
          setErrorType(null);
        } else if (reply.type !== '404') {
          setError(reply.error);
          setErrorType(reply.type || 'UNKNOWN');
        }
        setResponse(null);
        if (reply.limits) {
          setUser((prevUser: User) => ({
            ...prevUser,
            dailyMessagesUsed:
              reply.limits?.dailyMessagesUsed ?? prevUser.dailyMessagesUsed,
            extraMessages:
              reply.limits?.extraMessages ?? prevUser.extraMessages,
          }));
        }
      } else if (reply.reply) {
        logger.app.info('[ResponseGenerator] Setting response state:', {
          replyLength: reply.reply.length,
        });
        setResponse(reply.reply);
        setError(null);
        setErrorType(null);
        if (reply.limits) {
          setUser((prevUser: User) => ({
            ...prevUser,
            dailyMessagesUsed:
              reply.limits?.dailyMessagesUsed ?? prevUser.dailyMessagesUsed,
            extraMessages:
              reply.limits?.extraMessages ?? prevUser.extraMessages,
          }));
        }
      }
    } catch (error: any) {
      logger.app.error('[ResponseGenerator] Error in generateResponse:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      if (error.response?.data) {
        if (error.response.data.type === 'MESSAGE_LIMIT') {
          onMessageLimitReached?.();
          setError(null);
          setErrorType(null);
        } else if (error.response.status !== 404) {
          setError(error.response.data.error);
          setErrorType(error.response.data.type || 'UNKNOWN');
        }
        if (error.response.data.limits) {
          setUser((prevUser: User) => ({
            ...prevUser,
            dailyMessagesUsed:
              error.response.data.limits?.dailyMessagesUsed ??
              prevUser.dailyMessagesUsed,
            extraMessages:
              error.response.data.limits?.extraMessages ??
              prevUser.extraMessages,
          }));
        }
      } else {
        setError(error.message || MESSAGES.GENERATION_ERROR);
        setErrorType('UNKNOWN');
      }
      setResponse(null);
    } finally {
      logger.app.info('[ResponseGenerator] Finishing response generation');
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
