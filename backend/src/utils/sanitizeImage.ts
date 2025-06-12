import sharp from 'sharp';
import logger from './logger';

interface SanitizeImageOptions {
  stripMetadata?: boolean;
  maxSizeBytes?: number;
}

interface SanitizeImageResult {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

export async function sanitizeImage(
  input: Buffer,
  options: SanitizeImageOptions = {},
): Promise<SanitizeImageResult> {
  const {stripMetadata = true, maxSizeBytes = 1024 * 1024} = options; // Default to 1MB for Firestore

  try {
    // Get image metadata once
    const metadata = await sharp(input).metadata();
    const originalWidth = metadata.width || 1200;
    const originalHeight = metadata.height || 1200;
    const originalSize = input.length;
    const originalFormat = metadata.format || 'jpeg';

    // Calculate initial dimensions
    let width = Math.min(originalWidth, 1200);
    const height = Math.round((width * originalHeight) / originalWidth);

    // Try with high quality first
    let bestResult = await sharp(input)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(originalFormat, {quality: 90}) // Start with high quality
      .toBuffer({resolveWithObject: true});

    let currentQuality = 90; // Track the quality used

    // If still too large, try reducing quality
    if (bestResult.data.length > maxSizeBytes) {
      // Binary search for optimal quality
      let minQuality = 60; // Don't go below 60% quality
      let maxQuality = 90;

      while (minQuality <= maxQuality) {
        currentQuality = Math.floor((minQuality + maxQuality) / 2);

        const result = await sharp(input)
          .resize(width, height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(originalFormat, {quality: currentQuality})
          .toBuffer({resolveWithObject: true});

        if (result.data.length <= maxSizeBytes) {
          // This quality works, try to find a better one
          bestResult = result;
          minQuality = currentQuality + 1;
        } else {
          // Too large, need lower quality
          maxQuality = currentQuality - 1;
        }
      }

      // If we still couldn't find a working quality, try reducing dimensions
      if (bestResult.data.length > maxSizeBytes) {
        width = Math.round(width * 0.8); // Reduce width by 20%
        const newHeight = Math.round((width * originalHeight) / originalWidth);

        currentQuality = 60; // Set to minimum quality when reducing dimensions
        bestResult = await sharp(input)
          .resize(width, newHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFormat(originalFormat, {quality: currentQuality})
          .toBuffer({resolveWithObject: true});

        if (bestResult.data.length > maxSizeBytes) {
          throw new Error(
            `Image could not be compressed below ${maxSizeBytes} bytes. Current size: ${bestResult.data.length} bytes`,
          );
        }
      }
    }

    // Strip metadata if requested
    if (stripMetadata) {
      bestResult = await sharp(bestResult.data)
        .withMetadata({})
        .toBuffer({resolveWithObject: true});
    }

    logger.debug('Image compression result', {
      originalSize,
      finalSize: bestResult.data.length,
      quality: currentQuality,
      width: bestResult.info.width,
      height: bestResult.info.height,
      format: originalFormat,
    });

    return {
      buffer: bestResult.data,
      format: originalFormat,
      width: bestResult.info.width,
      height: bestResult.info.height,
      size: bestResult.data.length,
    };
  } catch (error) {
    logger.error('Error sanitizing image:', error);
    throw error;
  }
}
