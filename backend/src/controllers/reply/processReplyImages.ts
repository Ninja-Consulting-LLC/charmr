import logger from '../../utils/logger';
import {sanitizeImage} from '../../utils/sanitizeImage';

export type ProcessedReplyImages = {
  sanitizedForAi: string[];
  storedWithMetadata: string[];
};

/**
 * Sanitize incoming base64 images for AI (metadata stripped) and for storage (metadata kept).
 */
export async function processReplyImages(
  images: string[],
): Promise<ProcessedReplyImages> {
  const imagePromises = images.map(async (base64Image: string) => {
    try {
      const base64Data = base64Image.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      const aiSanitized = await sanitizeImage(imageBuffer, {
        stripMetadata: true,
      });

      const storedSanitized = await sanitizeImage(imageBuffer, {
        stripMetadata: false,
      });

      return {
        aiImage: `data:image/png;base64,${aiSanitized.buffer.toString('base64')}`,
        storedImage: `data:image/png;base64,${storedSanitized.buffer.toString(
          'base64',
        )}`,
      };
    } catch (error) {
      logger.error('Error sanitizing image:', error);
      throw new Error(
        'Failed to process image. Please try again with a different image.',
      );
    }
  });

  const results = await Promise.all(imagePromises);
  return {
    sanitizedForAi: results.map(r => r.aiImage),
    storedWithMetadata: results.map(r => r.storedImage),
  };
}
