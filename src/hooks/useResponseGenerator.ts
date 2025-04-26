import {useState} from 'react';
import {MESSAGES} from '../constants/messages';
import {generateReply} from '../services/api';
import {useStore} from '../store';
import {SelectedImage} from '../types';
import {SubscriptionTier} from '../types/subscription';
import {generateMatchId, Match} from '../utils/matchUtils';

interface UseResponseGeneratorProps {
  images: SelectedImage[];
  selectedMatch: Match | null;
  userPlan: SubscriptionTier;
}

interface UseResponseGeneratorReturn {
  response: string | null;
  loading: boolean;
  error: string | null;
  errorType: string | null;
  generateResponse: (prompt: string) => Promise<void>;
  resetResponse: () => void;
}

export const useResponseGenerator = ({
  images,
  selectedMatch,
  userPlan,
}: UseResponseGeneratorProps): UseResponseGeneratorReturn => {
  const {userId, setUser} = useStore();
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const convertToBase64 = async (path: string): Promise<string> => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting to base64:', error);
      throw error;
    }
  };

  const generateResponse = async (prompt: string) => {
    // Reset states at the start
    setLoading(true);
    setError(null);
    setErrorType(null);
    setResponse(null);

    if (images.length === 0) {
      setError(MESSAGES.NO_IMAGES);
      setErrorType('NO_IMAGES');
      setLoading(false);
      return;
    }

    if (userPlan !== SubscriptionTier.FREE && !selectedMatch) {
      setError(MESSAGES.SELECT_MATCH_REQUIRED);
      setErrorType('SELECT_MATCH_REQUIRED');
      setLoading(false);
      return;
    }

    try {
      const base64Images = await Promise.all(
        images.map(async img => {
          try {
            if (img.base64) return img.base64;
            return await convertToBase64(img.path);
          } catch (error) {
            console.error('Error converting to base64:', error);
            throw new Error('Failed to process images. Please try again.');
          }
        }),
      );

      const reply = await generateReply({
        prompt: prompt.trim() || 'make it flirty',
        images: base64Images,
        userId,
        matchId: selectedMatch ? generateMatchId(selectedMatch) : '',
      });

      console.log('Received reply:', reply);

      if (reply.error) {
        console.log('Setting error state:', {
          error: reply.error,
          type: reply.type,
        });
        setError(reply.error);
        setErrorType(reply.type || 'UNKNOWN');
        setResponse(null);
        if (reply.limits) {
          setUser({
            dailyMessagesUsed: reply.limits.dailyMessagesUsed,
            extraMessages: reply.limits.extraMessages,
          });
        }
      } else if (reply.reply) {
        console.log('Setting response state:', reply.reply);
        setResponse(reply.reply);
        setError(null);
        setErrorType(null);
        if (reply.limits) {
          setUser({
            dailyMessagesUsed: reply.limits.dailyMessagesUsed,
            extraMessages: reply.limits.extraMessages,
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating reply:', error);
      if (error.response?.data) {
        setError(error.response.data.error);
        setErrorType(error.response.data.type || 'UNKNOWN');
        if (error.response.data.limits) {
          setUser({
            dailyMessagesUsed: error.response.data.limits.dailyMessagesUsed,
            extraMessages: error.response.data.limits.extraMessages,
          });
        }
      } else {
        setError(error.message || MESSAGES.GENERATION_ERROR);
        setErrorType('UNKNOWN');
      }
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  const resetResponse = () => {
    setResponse(null);
    setError(null);
    setErrorType(null);
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
