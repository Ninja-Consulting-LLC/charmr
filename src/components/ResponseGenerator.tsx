import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useEffect, useState} from 'react';
import {Platform, ScrollView, StyleSheet, View} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {Button, Snackbar, Text, TextInput} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {useImagePicker} from '../hooks/useImagePicker';
import {useResponseGenerator} from '../hooks/useResponseGenerator';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/subscription';
import {
  addMatch,
  deleteMatch,
  getMatches,
  Match,
  updateMatchLastUsed,
} from '../utils/matchUtils';
import AddMatchModal from './AddMatchModal';
import ImageSelector from './ImageSelector';
import MatchSelector from './MatchSelector';
import MessagePackModal from './MessagePackModal';
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

const ResponseGenerator: React.FC = () => {
  const {userId, skipRateLimiting, user, setUser} = useStore();
  const {images, setImages, pickImages} = useImagePicker();

  // State
  const [prompt, setPrompt] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const [copyMessage, setCopyMessage] = useState(MESSAGES.MESSAGE_COPIED);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showScreenshotUpgrade, setShowScreenshotUpgrade] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);

  // Custom hooks
  const {response, loading, error, errorType, generateResponse, resetResponse} =
    useResponseGenerator({
      images,
      selectedMatch,
      userPlan: user?.plan || SubscriptionTier.FREE,
    });

  // Load matches on mount
  useEffect(() => {
    loadMatches();
    setShowMatchSelector(true);
  }, [user?.plan]);

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
        updateMatchLastUsed(selectedMatch);
      }
    } else if (error) {
      setShowSnackbar(true);
    }
  }, [response, error, errorType]);

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

  return (
    <View style={styles.container} testID="response-generator-container">
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {/* Match Selection */}
          {showMatchSelector && (
            <View style={styles.matchSection}>
              <MatchSelector
                matches={matches}
                selectedMatch={selectedMatch}
                onSelectMatch={setSelectedMatch}
                onAddMatch={() => setShowAddMatchModal(true)}
                onDeleteMatch={handleDeleteMatch}
                userPlan={user?.plan}
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

          {/* Prompt Input */}
          <View style={styles.promptSection}>
            <Text variant="titleMedium" style={{color: theme.colors.secondary}}>
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
};

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
});

export default ResponseGenerator;
