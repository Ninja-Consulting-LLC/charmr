import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import axios from 'axios';
import React, {useEffect, useState} from 'react';
import {
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
  Icon,
  IconButton,
  List,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {MESSAGES} from '../constants/messages';
import {useImagePicker} from '../hooks/useImagePicker';
import {generateReply} from '../services/api';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
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

const ResponseGenerator: React.FC = () => {
  const {userId, skipRateLimiting, user, setUser} = useStore();
  const {images, setImages, pickImages} = useImagePicker();

  // Keyboard modal state
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteScreenshots, setDeleteScreenshots] = useState(true);
  const [copyMessage, setCopyMessage] = useState(MESSAGES.MESSAGE_COPIED);

  // Match management state
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchDropdown, setShowMatchDropdown] = useState(false);

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showScreenshotUpgrade, setShowScreenshotUpgrade] = useState(false);

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
      setError(MESSAGES.NO_IMAGES);
      setShowSnackbar(true);
      return;
    }

    // Check message limits before submitting
    if (
      user.dailyMessagesUsed >= user.dailyMessageLimit &&
      user.extraMessages <= 0
    ) {
      setError(MESSAGES.MESSAGE_LIMIT);
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
      });

      if (response.error) {
        if (response.type === 'MESSAGE_LIMIT') {
          setError(MESSAGES.MESSAGE_LIMIT);
        } else {
          setError(response.error);
        }
        setShowSnackbar(true);
      } else {
        setResponse(response.reply);
        // Copy to clipboard immediately upon generation
        Clipboard.setString(response.reply);
        setShowReplyModal(true);
        if (selectedMatch) {
          await updateMatchLastUsed(selectedMatch);
        }
        // Update the user's message counts from the backend response
        if (response.limits) {
          setUser({
            dailyMessagesUsed: response.limits.dailyMessagesUsed,
            dailyMessageLimit: response.limits.dailyMessageLimit,
            extraMessages: response.limits.extraMessages,
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating reply:', error);
      if (axios.isAxiosError(error)) {
        if (
          error.response?.status === 403 &&
          error.response?.data?.type === 'MESSAGE_LIMIT'
        ) {
          setError(MESSAGES.MESSAGE_LIMIT);
        } else {
          setError(error.response?.data?.error || error.message);
        }
      } else {
        setError(MESSAGES.GENERATION_ERROR);
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

  const handlePickImages = async () => {
    if (user?.plan === SubscriptionTier.FREE && images.length > 0) {
      setShowScreenshotUpgrade(true);
      setShowUpgradeModal(true);
      return;
    }
    await pickImages();
  };

  return (
    <SafeAreaView
      style={styles.container}
      testID="response-generator-container">
      <ScrollView style={styles.scrollView}>
        {/* Match Selection */}
        <View style={styles.matchSection}>
          <View style={styles.matchHeader}>
            <Text variant="titleMedium">Select Match</Text>
            <IconButton
              icon="plus"
              onPress={() => setShowAddMatchModal(true)}
              testID="add-match-button"
            />
          </View>
          {matches.length > 0 ? (
            <List.Accordion
              title={
                selectedMatch
                  ? `${selectedMatch.name} (${selectedMatch.platform})`
                  : 'Select a match'
              }
              expanded={showMatchDropdown}
              onPress={() => setShowMatchDropdown(!showMatchDropdown)}
              testID="match-dropdown">
              {matches.map(match => (
                <List.Item
                  key={`${match.platform}::${match.name}`}
                  title={match.name}
                  description={match.platform}
                  right={props => (
                    <IconButton
                      {...props}
                      icon="delete"
                      onPress={() => handleDeleteMatch(match)}
                      testID={`delete-match-${match.name}`}
                    />
                  )}
                  onPress={() => {
                    setSelectedMatch(match);
                    setShowMatchDropdown(false);
                  }}
                  testID={`match-${match.name}`}
                />
              ))}
            </List.Accordion>
          ) : (
            <Text>No matches added yet</Text>
          )}
        </View>

        {/* Image Selection */}
        <View style={styles.imageSection}>
          <View style={styles.imageHeader}>
            <Text variant="titleMedium">Selected Images</Text>
            <View style={styles.imageActions}>
              <Text>Delete after use</Text>
              <Switch
                value={deleteScreenshots}
                onValueChange={setDeleteScreenshots}
                testID="delete-screenshots-switch"
              />
            </View>
          </View>
          <View style={styles.imageGrid}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{uri: image.path}}
                  style={styles.image}
                  resizeMode="cover"
                  testID={`selected-image-${index}`}
                />
                <Pressable
                  style={styles.removeImage}
                  onPress={() => removeImage(index)}
                  testID={`remove-image-${index}`}>
                  <Icon source="close" size={16} color="black" />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={styles.addImageButton}
              onPress={handlePickImages}
              testID="image-picker-button">
              <Icon
                source="image-plus"
                size={24}
                color={theme.colors.secondary}
              />
              <Text style={styles.addImageText}>Add Screenshot</Text>
              {user?.plan === SubscriptionTier.FREE && images.length > 0 && (
                <View style={styles.premiumBadge}>
                  <Icon source="star" size={12} color="gold" />
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Prompt Input */}
        <View style={styles.promptSection}>
          <Text variant="titleMedium">
            Enter your prompt (e.g. 'make it flirty')
          </Text>
          <TextInput
            value={prompt}
            onChangeText={setPrompt}
            multiline
            numberOfLines={4}
            style={styles.promptInput}
            testID="prompt-input"
          />
        </View>

        {/* Style Selection */}
        <View style={styles.styleSection}>
          <Text variant="titleMedium">Select Style</Text>
          <View style={styles.styleButtons}>
            {messageStyles.map(style => (
              <Button
                key={style.value}
                mode={selectedStyle === style.value ? 'contained' : 'outlined'}
                onPress={() => setSelectedStyle(style.value)}
                testID={`style-${style.value}-button`}>
                {style.label}
              </Button>
            ))}
          </View>
        </View>

        {/* Generate Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || images.length === 0}
          style={styles.generateButton}
          testID="submit-button">
          Generate Response
        </Button>
      </ScrollView>

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
        onFinish={handleFinish}
        onCopy={handleCopyToClipboard}
        onModifyResponse={handleModifyResponse}
      />

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        action={{
          label: 'Dismiss',
          onPress: () => setShowSnackbar(false),
        }}
        testID="error-snackbar">
        {error || copyMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  matchSection: {
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageSection: {
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  promptSection: {
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  promptInput: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: 8,
    padding: 12,
  },
  styleSection: {
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  styleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  generateButton: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: theme.colors.secondary,
    borderRadius: 8,
    paddingVertical: 8,
  },
  removeImage: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  removeImageContent: {
    padding: 0,
    margin: 0,
    width: 16,
    height: 16,
  },
  messageLimitSection: {
    margin: 16,
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 224, 208, 0.1)',
    gap: 8,
    position: 'relative',
  },
  addImageText: {
    fontSize: 12,
    textAlign: 'center',
    color: theme.colors.secondary,
  },
  premiumBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    padding: 2,
  },
});

export default ResponseGenerator;
