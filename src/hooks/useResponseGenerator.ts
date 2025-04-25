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
    if (images.length === 0) {
      setError(MESSAGES.NO_IMAGES);
      return;
    }

    if (userPlan !== SubscriptionTier.FREE && !selectedMatch) {
      setError(MESSAGES.SELECT_MATCH_REQUIRED);
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const base64Images = await Promise.all(
        images.map(async img => {
          try {
            if (img.base64) return img.base64;
            return await convertToBase64(img.path);
          } catch (error) {
            console.error('Error converting image to base64:', error);
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

      if (reply.error) {
        setError(reply.error);
      } else {
        setResponse(reply.reply);
        if (reply.limits) {
          setUser({
            dailyMessagesUsed: reply.limits.dailyMessagesUsed,
            extraMessages: reply.limits.extraMessages,
          });
        }
      }
    } catch (error) {
      console.error('Error generating reply:', error);
      setError(MESSAGES.GENERATION_ERROR);
    } finally {
      setLoading(false);
    }
  };

  const resetResponse = () => {
    setResponse(null);
    setError(null);
  };

  return {
    response,
    loading,
    error,
    generateResponse,
    resetResponse,
  };
};
