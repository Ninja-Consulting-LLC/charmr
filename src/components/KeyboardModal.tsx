import Clipboard from '@react-native-clipboard/clipboard';
import React, {useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import {generateReply} from '../services/api';

interface KeyboardModalProps {
  visible: boolean;
  onDismiss: () => void;
}

interface SelectedImage {
  path: string;
  base64?: string;
}

interface PickerImage {
  path: string;
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

  const pickImages = async () => {
    try {
      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        cropping: false,
      });

      const newImages = Array.isArray(result)
        ? result.map((img: PickerImage) => ({path: img.path}))
        : [{path: (result as PickerImage).path}];

      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error picking images:', error);
    }
  };

  const removeImage = (index: number) => {
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

  const copyToClipboard = () => {
    if (response) {
      Clipboard.setString(response);
      setShowSnackbar(true);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}>
        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Magic Keyboard
          </Text>

          <Button mode="outlined" onPress={pickImages} style={styles.button}>
            Pick Images
          </Button>

          {images.length > 0 && (
            <ScrollView horizontal style={styles.thumbnailContainer}>
              {images.map((img, index) => (
                <View key={index} style={styles.thumbnailWrapper}>
                  <Image source={{uri: img.path}} style={styles.thumbnail} />
                  <IconButton
                    icon="close"
                    size={20}
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  />
                </View>
              ))}
            </ScrollView>
          )}

          <TextInput
            label="Enter your prompt (e.g. 'make it flirty')"
            value={prompt}
            onChangeText={setPrompt}
            style={styles.input}
            multiline
          />

          <View style={styles.dropdownContainer}>
            <Text variant="bodyMedium">Message Style (optional):</Text>
            <View style={styles.styleButtons}>
              {messageStyles.map(style => (
                <Button
                  key={style.value}
                  mode={
                    selectedStyle === style.value ? 'contained' : 'outlined'
                  }
                  onPress={() => setSelectedStyle(style.value)}
                  style={styles.styleButton}>
                  {style.label}
                </Button>
              ))}
            </View>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            loading={loading}
            disabled={images.length === 0}>
            Generate Response
          </Button>

          {error && (
            <Text style={styles.errorText} variant="bodySmall">
              {error}
            </Text>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Generating response...</Text>
            </View>
          )}

          {response && (
            <View style={styles.responseContainer}>
              <Text variant="bodyLarge" style={styles.responseLabel}>
                Response:
              </Text>
              <Text
                variant="bodyMedium"
                style={styles.responseText}
                onPress={copyToClipboard}>
                {response}
              </Text>
              <Text variant="bodySmall" style={styles.tapToCopy}>
                Tap to copy
              </Text>
            </View>
          )}
        </View>
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
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  content: {
    gap: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  input: {
    marginTop: 8,
  },
  dropdownContainer: {
    marginTop: 8,
  },
  styleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  styleButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  thumbnailContainer: {
    flexDirection: 'row',
    marginTop: 8,
    maxHeight: 100,
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
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingText: {
    marginTop: 8,
  },
  responseContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  responseLabel: {
    marginBottom: 8,
  },
  responseText: {
    lineHeight: 24,
  },
  tapToCopy: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default KeyboardModal;
