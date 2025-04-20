import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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
import AddMatchModal from '../components/AddMatchModal';
import DevMenu from '../components/DevMenu';
import UpgradeModal from '../components/UpgradeModal';
import {RootStackParamList} from '../navigation/types';
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

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const {setShowDevMenu, userId, skipRateLimiting} = useStore();

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
    'Message copied to clipboard!',
  );

  // Match management state
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

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

  const handleSubmit = async () => {
    if (images.length === 0 || !selectedMatch) return;

    setLoading(true);
    setError(null);
    setResponse(null);
    setCopyMessage('Message copied to clipboard!');
    try {
      const imagesWithBase64 = await Promise.all(
        images.map(async img => ({
          ...img,
          base64: await convertToBase64(img.path),
        })),
      );

      const result = await generateReply({
        prompt,
        images: imagesWithBase64.map(img => img.base64!),
        userId,
        matchId: generateMatchId(selectedMatch),
        skipRateLimiting,
      });

      // Update last used timestamp
      await updateMatchLastUsed(selectedMatch);
      setMatches(await getMatches()); // Refresh sorted list

      setResponse(result.reply);
      Clipboard.setString(result.reply);
      setShowSnackbar(true);
    } catch (error) {
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
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    console.log('handleFinish called');
    await deleteScreenshotsFromLibrary();
    setImages([]);
    setPrompt('');
    setSelectedStyle('');
    setResponse(null);
    setError(null);
  };

  const handleCopyToClipboard = () => {
    if (response) {
      Clipboard.setString(response);
      setCopyMessage('Copied again!');
      setShowSnackbar(true);
    }
  };

  const handleUpgrade = (tierId: string) => {
    // TODO: Implement upgrade flow
    console.log('Upgrading to tier:', tierId);
    setShowUpgradeModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="headlineSmall">Magic Keyboard</Text>
            {__DEV__ && (
              <IconButton
                icon="cog"
                size={24}
                onPress={() => setShowDevMenu(true)}
                style={styles.settingsButton}
              />
            )}
          </View>
          <DevMenu />

          {/* Match Selection */}
          <View style={styles.matchSection}>
            <View style={styles.matchHeader}>
              <Text variant="bodyMedium">Select Match:</Text>
              <Button
                mode="text"
                onPress={() => setShowAddMatchModal(true)}
                icon="plus">
                Add New Match
              </Button>
            </View>

            <Surface style={styles.matchDropdown} elevation={1}>
              <Pressable
                style={styles.matchDropdownHeader}
                onPress={() => setShowMatchDropdown(!showMatchDropdown)}>
                <View style={styles.matchDropdownTitle}>
                  <List.Icon icon="account" />
                  <Text variant="bodyMedium">
                    {selectedMatch
                      ? `${selectedMatch.name} (${selectedMatch.platform})`
                      : 'Select a match'}
                  </Text>
                </View>
                <IconButton
                  icon={showMatchDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  onPress={() => setShowMatchDropdown(!showMatchDropdown)}
                />
              </Pressable>

              {showMatchDropdown && (
                <ScrollView style={styles.matchDropdownContent}>
                  {matches.map((match, index) => (
                    <Pressable
                      key={index}
                      style={[
                        styles.matchDropdownItem,
                        selectedMatch === match && styles.selectedMatch,
                      ]}
                      onPress={() => {
                        setSelectedMatch(match);
                        setShowMatchDropdown(false);
                      }}>
                      <List.Icon
                        icon="account"
                        color={selectedMatch === match ? '#1976D2' : undefined}
                      />
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.matchName,
                          selectedMatch === match && styles.selectedMatchText,
                        ]}>
                        {match.name} ({match.platform})
                      </Text>
                      {selectedMatch === match && (
                        <IconButton
                          icon="check-circle"
                          size={20}
                          iconColor="#1976D2"
                          style={styles.checkIcon}
                        />
                      )}
                      <View style={styles.spacer} />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleDeleteMatch(match)}
                      />
                    </Pressable>
                  ))}
                  {matches.length === 0 && (
                    <Text style={styles.emptyText}>
                      No matches yet. Add one to get started!
                    </Text>
                  )}
                </ScrollView>
              )}
            </Surface>
          </View>

          <View style={styles.buttonContainer}>
            <Button mode="outlined" onPress={pickImages}>
              Select Screenshots
            </Button>
            <View style={styles.toggleContainer}>
              <Text variant="bodySmall">Delete after</Text>
              <Switch
                value={deleteScreenshots}
                onValueChange={setDeleteScreenshots}
              />
            </View>
          </View>

          {images.length > 0 && (
            <View style={styles.screenshotsContainer}>
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
            </View>
          )}

          <TextInput
            label="Enter your prompt (e.g. 'make it flirty')"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            style={styles.promptInput}
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

          {response && (
            <Surface style={styles.responseContainer} elevation={0}>
              <Pressable onPress={handleCopyToClipboard}>
                <Text variant="bodyMedium">{response}</Text>
                <View style={styles.copyNotificationContainer}>
                  <Text variant="bodySmall" style={styles.tapToCopy}>
                    {copyMessage}
                  </Text>
                </View>
              </Pressable>
            </Surface>
          )}

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
            <Surface style={styles.errorContainer} elevation={0}>
              <Text variant="bodySmall" style={styles.errorText}>
                {error}
              </Text>
              {error.includes('Please try again in') && (
                <View style={styles.errorActions}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      // TODO: Implement upgrade flow
                      console.log('Upgrade clicked');
                    }}
                    style={styles.upgradeButton}>
                    Upgrade to get more messages
                  </Button>
                </View>
              )}
            </Surface>
          )}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text>Generating response...</Text>
            </View>
          )}

          <Snackbar
            visible={showSnackbar}
            onDismiss={() => setShowSnackbar(false)}
            duration={2000}>
            Copied!
          </Snackbar>
        </View>
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
        showRateLimitMessage={isRateLimited}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsButton: {
    margin: 0,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  copyNotificationContainer: {
    backgroundColor: '#e3f2fd',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  tapToCopy: {
    color: '#1976d2',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFF3F3',
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  errorActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  upgradeButton: {
    backgroundColor: '#4CAF50',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  matchSection: {
    marginBottom: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchDropdown: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  matchDropdownTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  matchDropdownContent: {
    maxHeight: 200,
  },
  matchDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  selectedMatch: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
    borderTopColor: '#1976D2',
    borderBottomColor: '#1976D2',
  },
  selectedMatchText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  screenshotsContainer: {
    marginBottom: 8,
    height: 100,
  },
  promptInput: {
    marginTop: 0,
  },
  matchName: {
    flex: 1,
  },
  checkIcon: {
    margin: 0,
  },
  spacer: {
    flex: 1,
  },
});

export default HomeScreen;
