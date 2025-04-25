import {useState} from 'react';
import ImagePicker from 'react-native-image-crop-picker';
import {useStore} from '../store';
import {SubscriptionTier} from '../types/enums';

interface SelectedImage {
  path: string;
  assetId?: string;
  base64?: string;
  mime?: string;
}

export const useImagePicker = () => {
  const {user, setShowUpgradeModal} = useStore();
  const [images, setImages] = useState<SelectedImage[]>([]);

  const openScreenshotPicker = async () => {
    try {
      const isPlusOrPremium =
        user?.plan === SubscriptionTier.PREMIUM ||
        user?.plan === SubscriptionTier.PRO;
      const maxFiles = isPlusOrPremium ? 10 : 1;

      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: isPlusOrPremium,
        cropping: false,
        writeTempFile: true,
        includeBase64: true,
        includeExif: true,
        smartAlbums: ['Screenshots'],
        defaultAlbum: 'Screenshots',
        maxFiles,
        selectedAssets: images.map(img => ({
          uri: img.path,
          type: img.mime || 'image/jpeg',
          ...(img.assetId && {id: img.assetId}),
        })),
      });

      return Array.isArray(result) ? result : [result];
    } catch (error: any) {
      if (error?.message !== 'User cancelled image selection') {
        console.error('Error picking images:', error);
      }
      throw error;
    }
  };

  const pickImages = async () => {
    try {
      // If user is on free plan and already has a screenshot, show upgrade modal
      if (user?.plan === SubscriptionTier.FREE && images.length > 0) {
        setShowUpgradeModal(true);
        return;
      }

      const result = await openScreenshotPicker();

      // Get currently selected image paths for comparison
      const existingPaths = new Set(images.map(img => img.path));
      const existingAssetIds = new Set(
        images.filter(img => img.assetId).map(img => img.assetId),
      );

      const newImages = result
        .filter(img => {
          // Filter out duplicates based on path or assetId
          const isDuplicate =
            existingPaths.has(img.path) ||
            (img.localIdentifier && existingAssetIds.has(img.localIdentifier));
          if (isDuplicate) {
            console.log('Skipping duplicate image:', img.path);
          }
          return !isDuplicate;
        })
        .map(img => ({
          path: img.path,
          assetId: img.localIdentifier || img.id,
          mime: img.mime,
        }));

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message !== 'User cancelled image selection'
      ) {
        console.error('Error picking images:', error);
      }
    }
  };

  return {
    images,
    setImages,
    pickImages,
  };
};
