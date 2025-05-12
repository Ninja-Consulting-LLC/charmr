import AsyncStorage from '@react-native-async-storage/async-storage';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {
  Button,
  IconButton,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {useImagePicker} from '../hooks/useImagePicker';
import {useResponseGenerator} from '../hooks/useResponseGenerator';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {
  addMatch,
  deleteMatch,
  hideMatch,
  Match,
  restoreMatch,
  updateMatchLastUsed,
} from '../utils/matchUtils';
import AddMatchModal from './AddMatchModal';
import ImageSelector from './ImageSelector';
import MatchSelectorModal from './MatchSelector';
import MessagePackModal from './MessagePackModal';
import ReplyModal from './ReplyModal';
import UpgradeModal from './UpgradeModal';

export interface ResponseGeneratorRef {
  loadMatches: () => Promise<void>;
}

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

const DATING_COACH_ENABLED_KEY = '@charmr/dating_coach_enabled';

const ResponseGenerator = forwardRef<ResponseGeneratorRef>((_, ref) => {
  const {
    userId,
    skipRateLimiting,
    user,
    setUser,
    matches,
    loadMatches,
    addMatch: addMatchToStore,
    updateMatch,
    removeMatch,
  } = useStore();
  const {images, setImages, pickImages} = useImagePicker();

  // State
  const [prompt, setPrompt] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const [copyMessage, setCopyMessage] = useState(MESSAGES.MESSAGE_COPIED);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showScreenshotUpgrade, setShowScreenshotUpgrade] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [isDatingCoachEnabled, setIsDatingCoachEnabled] = useState(false);

  // Custom hooks
  const {response, loading, error, errorType, generateResponse, resetResponse} =
    useResponseGenerator({
      images,
      selectedMatch,
      userPlan: user?.plan || SubscriptionTier.FREE,
    });

  useImperativeHandle(ref, () => ({
    loadMatches,
  }));

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, [user?.plan]);

  // Load dating coach preference on mount
  useEffect(() => {
    const loadDatingCoachPreference = async () => {
      try {
        const enabled = await AsyncStorage.getItem(DATING_COACH_ENABLED_KEY);
        setIsDatingCoachEnabled(enabled === 'true');
      } catch (error) {
        console.error('Error loading dating coach preference:', error);
      }
    };
    loadDatingCoachPreference();
  }, []);

  // Handle modal visibility based on state changes
  useEffect(() => {
    if (errorType === 'MESSAGE_LIMIT') {
      setShowMessagePackModal(true);
      setShowReplyModal(false);
    } else if (response) {
      setShowReplyModal(true);
      setShowMessagePackModal(false);
      handleCopyToClipboard();
      if (selectedMatch) {
        updateMatchLastUsed(selectedMatch.name, selectedMatch.platform);
      }
    } else if (error && errorType !== '404') {
      setShowSnackbar(true);
    }
  }, [response, error, errorType]);

  const handleAddMatch = async (name: string, platform: string) => {
    try {
      const newMatch = await addMatch(name, platform);
      if (newMatch) {
        addMatchToStore(newMatch);
        setSelectedMatch(newMatch);
        setShowAddMatchModal(false);
        loadMatches();
      }
    } catch (error) {
      console.error('Error adding match:', error);
    }
  };

  const handleDeleteMatch = async (match: Match) => {
    try {
      const success = await deleteMatch(match.name, match.platform);
      if (success) {
        removeMatch(match.id);
        if (selectedMatch?.id === match.id) {
          setSelectedMatch(null);
        }
      }
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  const handleHideMatch = async (match: Match) => {
    try {
      const success = await hideMatch(match.name, match.platform);
      if (success) {
        updateMatch({...match, hidden: true});
        if (selectedMatch?.id === match.id) {
          setSelectedMatch(null);
        }
      }
    } catch (error) {
      console.error('Error hiding match:', error);
    }
  };

  const handleRestoreMatch = async (match: Match) => {
    try {
      const success = await restoreMatch(match.name, match.platform);
      if (success) {
        updateMatch({...match, hidden: false});
      }
    } catch (error) {
      console.error('Error restoring match:', error);
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
    // Reset states at the start
    setShowReplyModal(false);
    setShowMessagePackModal(false);
    setShowSnackbar(false);

    try {
      await generateResponse(prompt);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setShowSnackbar(true);
    }
  };

  const handleDone = async () => {
    await deleteScreenshotsFromLibrary();
    setImages([]);
    setPrompt('');
    resetResponse();
    setShowReplyModal(false);
    setShowSnackbar(false);
  };

  const handleCopyToClipboard = () => {
    if (response) {
      Clipboard.setString(response);
      setShowSnackbar(true);
    }
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    setShowUpgradeModal(false);
  };

  const handleGenerateNew = () => {
    resetResponse();
    handleSubmit();
  };

  const handleModifyResponse = () => {
    setShowReplyModal(false);
    setShowSnackbar(false);
  };

  const handlePickImages = async () => {
    await pickImages();
  };

  const handleDeleteScreenshotsToggle = (value: boolean) => {
    setDeleteScreenshots(value);
  };

  // Save dating coach preference when changed
  const handleDatingCoachToggle = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(DATING_COACH_ENABLED_KEY, value.toString());
      setIsDatingCoachEnabled(value);
      if (!value) {
        setSelectedMatch(null);
      }
    } catch (error) {
      console.error('Error saving dating coach preference:', error);
    }
  };

  return (
    <View style={styles.container} testID="response-generator-container">
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {/* Dating Coach Toggle */}
          <View style={styles.datingCoachToggle}>
            <Text variant="titleMedium" style={styles.datingCoachLabel}>
              Dating Coach
            </Text>
            <Switch
              value={isDatingCoachEnabled}
              onValueChange={handleDatingCoachToggle}
              color={theme.colors.secondary}
            />
          </View>

          {/* Match Selection - Only show when dating coach is enabled */}
          {isDatingCoachEnabled && (
            <View style={styles.matchSection}>
              <View style={styles.selectedMatchContainer}>
                {selectedMatch ? (
                  <View style={styles.selectedMatchInfo}>
                    <View style={styles.selectedMatchHeader}>
                      <View>
                        <Text
                          variant="titleMedium"
                          style={styles.selectedMatchName}>
                          {selectedMatch.name}
                        </Text>
                        <Text
                          variant="bodyMedium"
                          style={styles.selectedMatchPlatform}>
                          {selectedMatch.platform}
                        </Text>
                      </View>
                      <View style={styles.matchActions}>
                        <IconButton
                          icon="pencil"
                          size={20}
                          onPress={() => setShowMatchSelector(true)}
                          style={styles.actionButton}
                        />
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() => setSelectedMatch(null)}
                          style={styles.actionButton}
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <Button
                    mode="outlined"
                    onPress={() => setShowMatchSelector(true)}
                    icon="account"
                    style={styles.matchButton}
                    textColor={theme.colors.secondary}>
                    Select Match
                  </Button>
                )}
              </View>
              <MatchSelectorModal
                visible={showMatchSelector}
                onDismiss={() => setShowMatchSelector(false)}
                matches={matches}
                selectedMatch={selectedMatch}
                onSelectMatch={setSelectedMatch}
                onAddMatch={() => {
                  setShowMatchSelector(false);
                  setShowAddMatchModal(true);
                }}
                onDeleteMatch={handleDeleteMatch}
                onHideMatch={handleHideMatch}
                onRestoreMatch={handleRestoreMatch}
                userPlan={user?.plan || SubscriptionTier.FREE}
              />
            </View>
          )}

          {/* Image Selection */}
          <ImageSelector
            images={images}
            onRemoveImage={removeImage}
            onPickImages={handlePickImages}
            userPlan={user?.plan}
          />

          {/* Prompt Input - Only show when dating coach is enabled */}
          {isDatingCoachEnabled && (
            <View style={styles.promptSection}>
              <Text
                variant="titleMedium"
                style={{color: theme.colors.secondary}}>
                Enter your prompt (required if no screenshot is provided)
              </Text>
              <TextInput
                value={prompt}
                onChangeText={setPrompt}
                multiline
                numberOfLines={4}
                style={[styles.promptInput]}
                testID="prompt-input"
                placeholder="e.g. 'Make it flirty and playful, but keep it classy' or 'I want to say something about her hat - it's a cute red beanie and she looks really stylish in it. Maybe something about how it matches her personality?'"
                placeholderTextColor={theme.colors.secondary}
                textAlignVertical="top"
                cursorColor={theme.colors.background}
                selectionColor={theme.colors.background}
                textColor={theme.colors.background}
                underlineColor="transparent"
                activeUnderlineColor="transparent"
              />
            </View>
          )}
        </ScrollView>

        {/* Generate Button */}
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading || (images.length === 0 && !prompt.trim())}
            style={styles.generateButton}
            testID="submit-button">
            Generate Response
          </Button>
        </View>
      </View>

      {/* Modals */}
      <AddMatchModal
        visible={showAddMatchModal}
        onDismiss={() => setShowAddMatchModal(false)}
        onAdd={handleAddMatch}
      />

      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => {
          setShowUpgradeModal(false);
          setShowScreenshotUpgrade(false);
        }}
        onUpgrade={handleUpgrade}
        showRateLimitMessage={isRateLimited}
        showScreenshotMessage={showScreenshotUpgrade}
      />

      <ReplyModal
        visible={showReplyModal}
        onDismiss={() => setShowReplyModal(false)}
        reply={response || ''}
        onDone={handleDone}
        onCopy={handleCopyToClipboard}
        onModifyResponse={handleModifyResponse}
        onDeleteScreenshots={handleDeleteScreenshotsToggle}
        deleteScreenshots={deleteScreenshots}
        hasScreenshots={images.length > 0}
      />

      <MessagePackModal
        visible={showMessagePackModal}
        onDismiss={() => {
          setShowMessagePackModal(false);
          setShowSnackbar(false);
        }}
        currentBalance={user?.extraMessages || 0}
        errorMessage={
          errorType === 'MESSAGE_LIMIT' ? MESSAGES.MESSAGE_LIMIT : undefined
        }
      />

      <Snackbar
        visible={showSnackbar && !showMessagePackModal}
        onDismiss={() => setShowSnackbar(false)}
        action={{
          label: 'Dismiss',
          onPress: () => setShowSnackbar(false),
        }}
        testID="error-snackbar">
        {error || copyMessage}
      </Snackbar>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  matchSection: {
    paddingBottom: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  promptSection: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  promptInput: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: 8,
    padding: 4,
    minHeight: 80,
  },
  buttonContainer: {
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    paddingHorizontal: 16,
  },
  generateButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  selectedMatchContainer: {
    marginBottom: 16,
  },
  selectedMatchInfo: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  selectedMatchName: {
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  selectedMatchPlatform: {
    color: theme.colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  matchButton: {
    marginBottom: 8,
    borderColor: theme.colors.secondary,
  },
  selectedMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  matchActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
  },
  datingCoachToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 16,
  },
  datingCoachLabel: {
    color: theme.colors.secondary,
  },
});

export default ResponseGenerator;
