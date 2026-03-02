import {useState} from 'react';

interface SelectedImage {
  path: string;
  assetId?: string;
  base64?: string;
  mime?: string;
}

const warn = (message: string) => {
  console.warn(`[web-preview] ${message}`);
};

export const useImagePicker = () => {
  const [images, setImages] = useState<SelectedImage[]>([]);

  const openSettings = () => {
    warn(
      'openSettings is a no-op on web preview. Use browser site permissions instead.',
    );
  };

  const pickImages = async () => {
    if (typeof document === 'undefined') {
      warn('Image picker is unavailable: document is not defined.');
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = false;

      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          resolve();
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        setImages([{path: objectUrl, mime: file.type}]);
        resolve();
      };

      input.onerror = () => {
        reject(new Error('Failed to open file picker.'));
      };

      input.click();
    });
  };

  return {
    images,
    setImages,
    pickImages,
    openSettings,
  };
};
