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
  IconButton,
  List,
  Menu,
  Modal,
  Portal,
  Snackbar,
  Surface,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
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

const PLATFORMS = ['hinge', 'tinder', 'bumble'];

const KeyboardModal: React.FC<KeyboardModalProps> = ({
  visible,
  onDismiss,
}): React.ReactElement => {
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const {userId} = useStore();

  // Match management state
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showNewMatchInput, setShowNewMatchInput] = useState(false);
  const [newMatchName, setNewMatchName] = useState('');
  const [newMatchPlatform, setNewMatchPlatform] = useState('');
  const [showMatchMenu, setShowMatchMenu] = useState(false);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const [platformError, setPlatformError] = useState('');

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    const loadedMatches = await getMatches();
    setMatches(loadedMatches);
  };

  const handleAddMatch = async () => {
    if (!newMatchName) return;

    if (!newMatchPlatform) {
      setPlatformError('Please select a platform');
      return;
    }

    const newMatch: Match = {
      name: newMatchName,
      platform: newMatchPlatform,
    };

    await addMatch(newMatch);
    setMatches(prev => [...prev, newMatch]);
    setSelectedMatch(newMatch);
    setNewMatchName('');
    setNewMatchPlatform('');
    setShowNewMatchInput(false);
    setPlatformError('');
  };

  const handleDeleteMatch = async (match: Match) => {
    await deleteMatch(match);
    setMatches(prev => prev.filter(m => m !== match));
    if (selectedMatch === match) {
      setSelectedMatch(null);
    }
  };

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
    if (images.length === 0 || !selectedMatch) return;

    setLoading(true);
    setError(null);
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
      });

      // Update last used timestamp
      await updateMatchLastUsed(selectedMatch);
      setMatches(await getMatches()); // Refresh sorted list

      setResponse(result.reply);
      Clipboard.setString(result.reply);
      setShowSnackbar(true);
    } catch (error) {
      console.error('Error generating reply:', error);
      if (error instanceof Error) {
        setError(error.message);
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

            {/* Match Selection */}
            <View style={styles.matchSection}>
              <View style={styles.matchHeader}>
                <Text variant="bodyMedium">Select Match:</Text>
                <Button
                  mode="text"
                  onPress={() => setShowNewMatchInput(true)}
                  icon="plus">
                  Add New Match
                </Button>
              </View>

              {showNewMatchInput ? (
                <View style={styles.newMatchInput}>
                  <TextInput
                    label="Name"
                    value={newMatchName}
                    onChangeText={setNewMatchName}
                    style={styles.input}
                  />
                  <Menu
                    visible={showPlatformMenu}
                    onDismiss={() => setShowPlatformMenu(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setShowPlatformMenu(true)}
                        style={styles.platformButton}>
                        {newMatchPlatform || 'Select Platform'}
                      </Button>
                    }>
                    {PLATFORMS.map(platform => (
                      <Menu.Item
                        key={platform}
                        onPress={() => {
                          setNewMatchPlatform(platform);
                          setShowPlatformMenu(false);
                          setPlatformError('');
                        }}
                        title={platform}
                      />
                    ))}
                  </Menu>
                  {platformError && (
                    <Text style={styles.errorText}>{platformError}</Text>
                  )}
                  <View style={styles.newMatchActions}>
                    <Button onPress={handleAddMatch}>Add</Button>
                    <Button
                      onPress={() => {
                        setShowNewMatchInput(false);
                        setPlatformError('');
                      }}>
                      Cancel
                    </Button>
                  </View>
                </View>
              ) : (
                <ScrollView style={styles.matchList}>
                  {matches.map((match, index) => (
                    <List.Item
                      key={index}
                      title={`${match.name} (${match.platform})`}
                      left={props => <List.Icon {...props} icon="account" />}
                      right={props => (
                        <IconButton
                          {...props}
                          icon="delete"
                          onPress={() => handleDeleteMatch(match)}
                        />
                      )}
                      onPress={() => setSelectedMatch(match)}
                      style={[
                        styles.matchItem,
                        selectedMatch === match && styles.selectedMatch,
                      ]}
                    />
                  ))}
                  {matches.length === 0 && (
                    <Text style={styles.emptyText}>
                      No matches yet. Add one to get started!
                    </Text>
                  )}
                </ScrollView>
              )}
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

            {response && (
              <Surface style={styles.responseContainer} elevation={0}>
                <Text variant="bodyLarge">Response:</Text>
                <Text variant="bodyMedium">{response}</Text>
                <Text variant="bodySmall" style={styles.tapToCopy}>
                  Message copied to clipboard!
                </Text>
              </Surface>
            )}

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
    gap: 8,
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
  matchList: {
    maxHeight: 120,
  },
  matchItem: {
    paddingVertical: 4,
  },
  selectedMatch: {
    backgroundColor: '#e3f2fd',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 16,
  },
  newMatchInput: {
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
  },
  newMatchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  platformButton: {
    marginBottom: 8,
  },
});

export default KeyboardModal;
