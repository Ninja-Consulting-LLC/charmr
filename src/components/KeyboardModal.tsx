import Clipboard from '@react-native-clipboard/clipboard';
import React, {useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {
  ActivityIndicator,
  Button,
  IconButton,
  Modal,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

interface KeyboardModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const KeyboardModal: React.FC<KeyboardModalProps> = ({visible, onDismiss}) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [gptResponse, setGptResponse] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  const pickImage = async () => {
    try {
      setError(null);
      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        cropping: true,
        includeBase64: true,
        compressImageQuality: 0.8,
      });

      if (result.data) {
        setImage(result.data);
      }
    } catch (error) {
      console.log('Image picker error:', error);
      setError('Failed to pick image. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!image || !prompt) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Mock API call with delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock GPT response
      const mockResponse =
        'Hey there! I noticed your amazing smile in that photo. You seem like someone who knows how to have a good time. Would love to get to know you better! 😊';
      setGptResponse(mockResponse);
    } catch (error) {
      setError('Failed to generate response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (gptResponse) {
      Clipboard.setString(gptResponse);
      setShowToast(true);
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          {backgroundColor: theme.colors.surface},
        ]}>
        <View style={styles.container}>
          <Text
            variant="headlineSmall"
            style={[styles.title, {color: theme.colors.onSurface}]}>
            Magic Keyboard
          </Text>

          {error && (
            <Text
              style={[styles.errorText, {color: theme.colors.error}]}
              variant="bodySmall">
              {error}
            </Text>
          )}

          <Button mode="outlined" onPress={pickImage} style={styles.button}>
            {image ? 'Change Image' : 'Pick an Image'}
          </Button>

          {image && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{uri: `data:image/jpeg;base64,${image}`}}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            </View>
          )}

          <TextInput
            label="Enter your prompt"
            value={prompt}
            onChangeText={setPrompt}
            style={styles.input}
            multiline
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.button}
            disabled={!image || !prompt || loading}>
            Generate Response
          </Button>

          {loading && <ActivityIndicator style={styles.loader} />}

          {gptResponse && (
            <View style={styles.responseContainer}>
              <Text
                variant="bodyLarge"
                style={[styles.responseText, {color: theme.colors.onSurface}]}>
                {gptResponse}
              </Text>
              <IconButton
                icon="content-copy"
                size={20}
                onPress={copyToClipboard}
                style={styles.copyButton}
              />
            </View>
          )}
        </View>
      </Modal>

      <Snackbar
        visible={showToast}
        onDismiss={() => setShowToast(false)}
        duration={2000}>
        Copied to clipboard!
      </Snackbar>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  container: {
    gap: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  input: {
    marginTop: 8,
  },
  loader: {
    marginTop: 16,
  },
  responseContainer: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  responseText: {
    flex: 1,
  },
  copyButton: {
    marginLeft: 8,
  },
});

export default KeyboardModal;
