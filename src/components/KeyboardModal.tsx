import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {
  Button,
  Modal,
  Portal,
  Snackbar,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {generateReply} from '../services/api';

interface CameraRollAsset {
  node: {
    image: {
      uri: string;
    };
  };
}

interface CameraRollResponse {
  edges: CameraRollAsset[];
}

interface KeyboardModalProps {
  visible: boolean;
  onDismiss: () => void;
}

interface SelectedImage {
  path: string;
  assetId?: string;
  base64?: string;
}

interface PickerImage {
  path: string;
  assetId?: string;
}

const messageStyles = [
  {label: 'Flirty', value: 'flirty'},
  {label: 'Smooth', value: 'smooth'},
  {label: 'Funny', value: 'funny'},
];

const KeyboardModal: React.FC<KeyboardModalProps> = ({visible, onDismiss}) => {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);

  // Reset all state when modal is closed
  useEffect(() => {
    if (!visible) {
      setImages([]);
      setPrompt('');
      setSelectedStyle('');
      setResponse(null);
      setError(null);
    }
  }, [visible]);

  const pickImages = async () => {
    try {
      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        cropping: false,
        writeTempFile: true,
        includeBase64: true,
        includeExif: true,
      });

      console.log('Image picker result:', result);

      const newImages = Array.isArray(result)
        ? result.map((img: any) => ({
            path: img.path,
            assetId: img.localIdentifier || img.id,
          }))
        : [
            {
              path: (result as any).path,
              assetId: (result as any).localIdentifier || (result as any).id,
            },
          ];

      console.log('Processed images:', newImages);
      setImages(prev => [...prev, ...newImages]);
    } catch (error: any) {
      if (error?.message !== 'User cancelled image selection') {
        console.error('Error picking images:', error);
      }
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    console.log('Attempting to remove image:', imageToRemove);

    if (deleteScreenshots) {
      try {
        if (Platform.OS === 'ios' && imageToRemove.assetId) {
          console.log(
            'iOS: Deleting photo with assetId:',
            imageToRemove.assetId,
          );
          await CameraRoll.deletePhotos([imageToRemove.assetId]);
          console.log('Successfully deleted photo from library');
        } else {
          console.log('Android: Cleaning up temporary file');
          await ImagePicker.cleanSingle(imageToRemove.path);
        }
      } catch (error: any) {
        console.error('Error deleting image:', error);
        // Continue with removing from state even if file deletion fails
      }
    }
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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

  const deleteScreenshotsFromLibrary = async () => {
    console.log('Starting deleteScreenshotsFromLibrary');
    console.log('deleteScreenshots:', deleteScreenshots);
    console.log('Number of images to delete:', images.length);
    console.log('Images:', images);

    if (!deleteScreenshots || images.length === 0) {
      console.log(
        'Skipping deletion - deleteScreenshots is false or no images',
      );
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        const assetIds = images
          .filter(img => img.assetId)
          .map(img => img.assetId!);

        console.log('Asset IDs to delete:', assetIds);

        if (assetIds.length > 0) {
          console.log('Attempting to delete photos from library');
          await CameraRoll.deletePhotos(assetIds);
          console.log('Successfully deleted photos from library');
        } else {
          console.log('No asset IDs found to delete');
        }
      } else {
        console.log('Android: Cleaning up temporary files');
        for (const image of images) {
          try {
            await ImagePicker.cleanSingle(image.path);
            console.log('Successfully cleaned up temporary file:', image.path);
          } catch (error: any) {
            console.error(`Error deleting image ${image.path}:`, error);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in batch deletion:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
    }
    // Clear the images array regardless of deletion success
    setImages([]);
  };

  const handleDismiss = async () => {
    onDismiss();
  };

  const handleSubmit = async () => {
    if (images.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      // Convert all images to base64
      const imagesWithBase64 = await Promise.all(
        images.map(async img => ({
          ...img,
          base64: await convertToBase64(img.path),
        })),
      );

      const result = await generateReply({
        prompt,
        images: imagesWithBase64.map(img => img.base64!),
        userId: 'test-user', // TODO: Replace with actual user ID
      });

      setResponse(result.reply);
    } catch (error) {
      console.error('Error generating response:', error);
      setError('Failed to generate response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    console.log('handleFinish called');
    await deleteScreenshotsFromLibrary();
    onDismiss();
  };

  const copyToClipboard = () => {
    if (response) {
      Clipboard.setString(response);
      setShowSnackbar(true);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={handleDismiss}>
        <Surface style={styles.modal} elevation={0}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text variant="headlineSmall">Magic Keyboard</Text>
              <Button mode="text" onPress={handleDismiss} compact>
                ✕
              </Button>
            </View>

            <View style={styles.toggleContainer}>
              <Text>Delete screenshots after response</Text>
              <Switch
                value={deleteScreenshots}
                onValueChange={setDeleteScreenshots}
              />
            </View>

            <View style={styles.buttonContainer}>
              <Button mode="outlined" onPress={pickImages}>
                Select Screenshots
              </Button>
            </View>

            {images.length > 0 && (
              <ScrollView horizontal>
                {images.map((img, index) => (
                  <View key={index} style={styles.thumbnailWrapper}>
                    <Image source={{uri: img.path}} style={styles.thumbnail} />
                    <Button
                      mode="text"
                      onPress={() => removeImage(index)}
                      style={styles.removeButton}
                      compact>
                      ✕
                    </Button>
                  </View>
                ))}
              </ScrollView>
            )}

            <TextInput
              label="Enter your prompt (e.g. 'make it flirty')"
              value={prompt}
              onChangeText={setPrompt}
              multiline
            />

            <View>
              <Text variant="bodyMedium">Message Style (optional):</Text>
              <View style={styles.styleButtons}>
                {messageStyles.map(style => (
                  <Button
                    key={style.value}
                    mode={
                      selectedStyle === style.value ? 'contained' : 'outlined'
                    }
                    onPress={() => setSelectedStyle(style.value)}>
                    {style.label}
                  </Button>
                ))}
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={images.length === 0}>
              Generate Response
            </Button>

            <Button mode="outlined" onPress={handleFinish}>
              Finish
            </Button>

            {error && (
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text>Generating response...</Text>
              </View>
            )}

            {response && (
              <Surface style={styles.responseContainer} elevation={0}>
                <Text variant="bodyLarge">Response:</Text>
                <Text variant="bodyMedium" onPress={copyToClipboard}>
                  {response}
                </Text>
                <Text variant="bodySmall" style={styles.tapToCopy}>
                  Tap to copy
                </Text>
              </Surface>
            )}
          </View>
        </Surface>
      </Modal>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}>
        Copied!
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 28,
  },
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  styleButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 32,
    backgroundColor: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  responseContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  tapToCopy: {
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default KeyboardModal;
