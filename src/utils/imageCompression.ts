import ImageResizer from 'react-native-image-resizer';

export interface CompressedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/**
 * Compresses a single image and returns its data including base64 representation
 * @param imageUri The URI of the image to compress
 * @returns Promise<CompressedImage> The compressed image data
 */
export const compressImage = async (
  imageUri: string,
): Promise<CompressedImage> => {
  try {
    // Resize and compress the image
    const resizedImage = await ImageResizer.createResizedImage(
      imageUri,
      720, // max width
      720, // max height
      'JPEG',
      70, // quality
      0, // rotation
      undefined, // output path (undefined = temp directory)
      false, // keep metadata
      {mode: 'contain', onlyScaleDown: true},
    );

    // Convert to base64
    const response = await fetch(resizedImage.uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          uri: resizedImage.uri,
          base64: reader.result as string,
          width: resizedImage.width,
          height: resizedImage.height,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
};

/**
 * Compresses multiple images in parallel
 * @param imageUris Array of image URIs to compress
 * @returns Promise<CompressedImage[]> Array of compressed image data
 */
export const compressImages = async (
  imageUris: string[],
): Promise<CompressedImage[]> => {
  try {
    const compressionPromises = imageUris.map(uri => compressImage(uri));
    return await Promise.all(compressionPromises);
  } catch (error) {
    console.error('Error compressing multiple images:', error);
    throw error;
  }
};
