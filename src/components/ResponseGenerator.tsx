import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {Image, Platform, ScrollView, StyleSheet, View} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {
  Button,
  IconButton,
  List,
  Snackbar,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {generateReply} from '../services/api';
import {useStore} from '../store';
import {
  Match,
  addMatch,
  deleteMatch,
  generateMatchId,
  getMatches,
  updateMatchLastUsed,
} from '../utils/matchUtils';
import AddMatchModal from './AddMatchModal';
import ReplyModal from './ReplyModal';
import UpgradeModal from './UpgradeModal';

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

interface PickerImage {
  path: string;
  localIdentifier?: string;
  id?: string;
  mime?: string;
}

interface SelectedImage {
  path: string;
  assetId?: string;
  base64?: string;
  mime?: string;
}

const messageStyles = [
  {label: 'Flirty', value: 'flirty'},
  {label: 'Smooth', value: 'smooth'},
  {label: 'Funny', value: 'funny'},
];

const PLATFORMS = ['hinge', 'tinder', 'bumble'];

const HomeContent: React.FC = () => {
  const {userId, skipRateLimiting} = useStore();

  // Keyboard modal state
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const [copyMessage, setCopyMessage] = useState(
    'Message copied to clipboard! Return to your dating app to paste the message.',
  );

  // Match management state
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Reply modal state
  const [showReplyModal, setShowReplyModal] = useState(false);

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const loadedMatches = await getMatches();
    setMatches(loadedMatches);
  };

  const handleAddMatch = async (name: string, platform: string) => {
    const newMatch: Match = {
      name,
      platform,
    };

    await addMatch(newMatch);
    setMatches(prev => [newMatch, ...prev]);
    setSelectedMatch(newMatch);
  };

  const handleDeleteMatch = async (match: Match) => {
    await deleteMatch(match);
    setMatches(prev => prev.filter(m => m !== match));
    if (selectedMatch === match) {
      setSelectedMatch(null);
    }
  };

  const pickImages = async () => {
    try {
      // Get currently selected image paths for comparison
      const existingPaths = new Set(images.map(img => img.path));
      const existingAssetIds = new Set(
        images.filter(img => img.assetId).map(img => img.assetId),
      );

      const result = await ImagePicker.openPicker({
        mediaType: 'photo',
        multiple: true,
        cropping: false,
        writeTempFile: true,
        includeBase64: true,
        includeExif: true,
        selectedAssets: images.map(img => ({
          uri: img.path,
          type: img.mime || 'image/jpeg',
          ...(img.assetId && {id: img.assetId}),
        })),
      });

      console.log('Image picker result:', result);

      const newImages = (
        (Array.isArray(result) ? result : [result]) as PickerImage[]
      )
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

      console.log('New unique images:', newImages);
      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error: any) {
      if (error?.message !== 'User cancelled image selection') {
        console.error('Error picking images:', error);
      }
    }
  };

  const removeImage = async (index: number) => {
    // Simply remove from selection without deleting
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
        }
      } else {
        // For Android, we clean up the temporary files
        for (const image of images) {
          await ImagePicker.cleanSingle(image.path);
        }
      }
    } catch (error) {
      console.error('Error deleting screenshots:', error);
    }
  };

  const handleSubmit = async () => {
    if (images.length === 0) {
      setError('Please select at least one image');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert images to base64
      const base64Images = await Promise.all(
        images.map(async img => {
          if (img.base64) return img.base64;
          const base64 = await convertToBase64(img.path);
          return base64;
        }),
      );

      const response = await generateReply({
        prompt: prompt.trim() || 'make it flirty',
        images: base64Images,
        userId,
        matchId: selectedMatch ? generateMatchId(selectedMatch) : '',
        skipRateLimiting,
      });

      if (response.error) {
        setError(response.error);
        setShowSnackbar(true);
      } else {
        setResponse(response.reply);
        // Copy to clipboard immediately upon generation
        Clipboard.setString(response.reply);
        setShowReplyModal(true);
        if (selectedMatch) {
          await updateMatchLastUsed(selectedMatch);
        }
      }
    } catch (error: any) {
      console.error('Error generating reply:', error);
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        setIsRateLimited(true);
        setShowUpgradeModal(true);
        setError(
          "You've reached your daily message limit. Upgrade to continue.",
        );
      } else if (axios.isAxiosError(error)) {
        setError(error.response?.data?.error || error.message);
      } else {
        setError('Failed to generate response. Please try again.');
      }
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    await deleteScreenshotsFromLibrary();
    setImages([]);
    setPrompt('');
    setResponse(null);
    setSelectedStyle('');
    setShowReplyModal(false);
  };

  const handleCopyToClipboard = () => {
    if (response) {
      Clipboard.setString(response);
      setShowSnackbar(true);
    }
  };

  const handleUpgrade = (tierId: string) => {
    // Handle upgrade logic here
    setShowUpgradeModal(false);
  };

  const handleGenerateNew = () => {
    setResponse(null);
    handleSubmit();
  };

  const handleModifyResponse = () => {
    setShowReplyModal(false);
  };

  return (
    <SafeAreaView
      style={styles.container}
      testID="response-generator-container">
      <ScrollView style={styles.scrollView}>
        <Surface style={styles.surface}>
          <View style={styles.imageContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image
                  source={{uri: image.path}}
                  style={styles.image}
                  testID={`selected-image-${index}`}
                />
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => removeImage(index)}
                  testID={`remove-image-${index}`}
                />
              </View>
            ))}
          </View>

          <Button
            mode="contained"
            onPress={pickImages}
            style={styles.button}
            testID="image-picker-button">
            Select Images
          </Button>

          <TextInput
            label="Prompt"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            style={styles.input}
            testID="prompt-input"
          />

          <List.Accordion
            title="Message Style"
            expanded={showMatchDropdown}
            onPress={() => setShowMatchDropdown(!showMatchDropdown)}
            testID="style-dropdown">
            {messageStyles.map(style => (
              <List.Item
                key={style.value}
                title={style.label}
                onPress={() => {
                  setSelectedStyle(style.value);
                  setShowMatchDropdown(false);
                }}
              />
            ))}
          </List.Accordion>

          <View style={styles.switchContainer}>
            <Text>Delete screenshots after use</Text>
            <Switch
              value={deleteScreenshots}
              onValueChange={setDeleteScreenshots}
              testID="delete-screenshots-switch"
            />
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            testID="submit-button">
            Generate Response
          </Button>

          {response && (
            <View style={styles.responseContainer}>
              <TextInput
                value={response}
                multiline
                editable={false}
                style={styles.responseInput}
                testID="response-text"
              />
              <Button
                mode="contained"
                onPress={handleCopyToClipboard}
                style={styles.button}
                testID="copy-button">
                Copy to Clipboard
              </Button>
            </View>
          )}

          {error && (
            <Snackbar
              visible={showSnackbar}
              onDismiss={() => setShowSnackbar(false)}
              action={{
                label: 'Dismiss',
                onPress: () => setShowSnackbar(false),
              }}
              testID="error-snackbar">
              {error}
            </Snackbar>
          )}
        </Surface>
      </ScrollView>

      <AddMatchModal
        visible={showAddMatchModal}
        onDismiss={() => setShowAddMatchModal(false)}
        onAdd={handleAddMatch}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
      />

      <ReplyModal
        visible={showReplyModal}
        onDismiss={() => setShowReplyModal(false)}
        reply={response || ''}
        onFinish={handleFinish}
        onCopy={handleCopyToClipboard}
        onModifyResponse={handleModifyResponse}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  surface: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  button: {
    marginBottom: 16,
  },
  input: {
    marginTop: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseContainer: {
    marginTop: 16,
  },
  responseInput: {
    marginBottom: 8,
  },
});

export default HomeContent;
