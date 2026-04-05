import {useState} from 'react';
import {Image, Linking, Platform} from 'react-native';
import Config from 'react-native-config';
import ImagePicker from 'react-native-image-crop-picker';
import {useStore} from '../store';

interface Image {
  path: string;
  localIdentifier?: string;
  id?: string;
  mime?: string;
  type?: string;
  uri?: string;
}

interface SelectedImage {
  path: string;
  assetId?: string;
  base64?: string;
  mime?: string;
}

interface PickerImage {
  path: string;
  localIdentifier?: string;
  id?: string;
  mime?: string;
}

export const useImagePicker = () => {
  const {user, setShowUpgradeModal} = useStore();
  const [images, setImages] = useState<SelectedImage[]>([]);

  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };

  const openScreenshotPicker = async () => {
    // Default: Screenshots only (product). Optional Maestro native-picker build uses Recently Added
    // so `simctl addmedia` seeds a predictable single-album grid (see `.env.e2e.native-picker`).
    const smartAlbums: Array<
      'Screenshots' | 'RecentlyAdded'
    > =
      Config.CHARMR_E2E_NATIVE_PICKER_TEST === 'true'
        ? ['RecentlyAdded']
        : ['Screenshots'];

    try {
      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: false,
        cropping: false,
        writeTempFile: true,
        includeBase64: true,
        includeExif: true,
        // iOS: patch-package skips the one-row album list when a single smart album matches (see patches/react-native-image-crop-picker+*.patch).
        smartAlbums,
        maxFiles: 1,
        selectedAssets: images.map(img => ({
          uri: img.path,
          type: img.mime || 'image/jpeg',
          ...(img.assetId && {id: img.assetId}),
        })),
      });

      return Array.isArray(result) ? result : [result];
    } catch (error: any) {
      if (error?.message === 'User cancelled image selection') {
        return null;
      }

      // Handle permission errors
      if (
        error?.message?.includes('permission') ||
        error?.message?.includes('Permission')
      ) {
        throw new Error('PERMISSION_DENIED');
      }

      // Handle case when there are no photos in the album
      if (
        error?.message?.includes('no photos') ||
        error?.message?.includes('No photos found') ||
        error?.message?.includes('No assets found')
      ) {
        return null;
      }

      console.error('Error picking images:', error);
      throw error;
    }
  };

  const pickImages = async () => {
    if (Config.CHARMR_E2E_RELAX_IMAGE_PICKER === 'true') {
      try {
        const src = Image.resolveAssetSource(
          require('../../assets/logo.png'),
        );
        if (src?.uri) {
          setImages([{path: src.uri, mime: 'image/png'}]);
        }
      } catch (e) {
        console.warn('[E2E] bundled image inject failed', e);
      }
      return;
    }

    try {
      const result = await openScreenshotPicker();

      // If user cancelled, return early
      if (!result) {
        return;
      }

      // Get currently selected image paths for comparison
      const existingPaths = new Set(images.map(img => img.path));
      const existingAssetIds = new Set(
        images.filter(img => img.assetId).map(img => img.assetId),
      );

      const newImages = (result as PickerImage[])
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
      if (error instanceof Error) {
        if (error.message === 'PERMISSION_DENIED') {
          throw error;
        }
        console.error('Error picking images:', error);
      }
      throw error;
    }
  };

  return {
    images,
    setImages,
    pickImages,
    openSettings,
  };
};
