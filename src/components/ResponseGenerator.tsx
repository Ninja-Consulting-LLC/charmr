import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import Clipboard from '@react-native-clipboard/clipboard';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import axios from 'axios';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {Platform, StyleSheet, useWindowDimensions, View} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import {Snackbar} from 'react-native-paper';
import {MESSAGES} from '../constants/messages';
import {
  AppText,
  CharmrButton,
  getScreenshotTileDimensions,
  Section,
  tokens,
} from '../design-system';
import {useImagePicker} from '../hooks/useImagePicker';
import {useResponseGenerator} from '../hooks/useResponseGenerator';
import {RootStackParamList} from '../navigation/types';
import {
  deleteMatch,
  hideMatch,
  restoreMatch,
  updateMatchLastUsed,
} from '../services/matchService';
import {useStore} from '../store';
import {MessageMode, SubscriptionTier} from '../types/enums';
import {logger} from '../utils/logger';
import {Match, addMatch as addMatchUtil} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';
import ImageSelector from './ImageSelector';
import LoginModal from './LoginModal';
import MatchSelectorModal from './MatchSelector';
import MessagePackModal from './MessagePackModal';
import PermissionHelpModal from './PermissionHelpModal';
import PhotoAccessBanner from './PhotoAccessBanner';
import PurchaseSuccessModal from './PurchaseSuccessModal';
import ReplyModal from './ReplyModal';
import TryAgainModal from './TryAgainModal';
import UpgradeModal from './UpgradeModal';

export interface ResponseGeneratorRef {
  loadMatches: () => Promise<void>;
  openCoach: () => void;
}

type ResponseGeneratorProps = {
  navigation: NativeStackScreenProps<RootStackParamList, 'Home'>['navigation'];
};

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

const ResponseGenerator = forwardRef<
  ResponseGeneratorRef,
  ResponseGeneratorProps
>(({navigation}: ResponseGeneratorProps, ref) => {
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
    selectedMatch,
    setSelectedMatch,
    deleteScreenshots,
    setDeleteScreenshots,
    setMatches,
    handleProviderLogin,
  } = useStore();
  const {height: windowHeight} = useWindowDimensions();
  const {tileWidth: screenshotTileWidth} =
    getScreenshotTileDimensions(windowHeight);
  const {images, setImages, pickImages, openSettings} = useImagePicker();

  // State
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [copyMessage, setCopyMessage] = useState(MESSAGES.MESSAGE_COPIED);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showScreenshotUpgrade, setShowScreenshotUpgrade] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [showPurchaseSuccess, setShowPurchaseSuccess] = useState(false);
  const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTryAgainModal, setShowTryAgainModal] = useState(false);

  // Custom hooks
  const {response, loading, error, errorType, generateResponse, resetResponse} =
    useResponseGenerator({
      images,
      selectedMatch,
      userPlan: user?.plan || SubscriptionTier.FREE,
      mode: MessageMode.GENERATE,
      onMessageLimitReached: () => {
        setShowUpgradeModal(true);
        setShowMessagePackModal(false);
        setShowReplyModal(false);
      },
    });

  useImperativeHandle(ref, () => ({
    loadMatches,
    openCoach: () => setShowMatchSelector(true),
  }));

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, [user?.plan]);

  // Handle modal visibility based on state changes
  useEffect(() => {
    if (errorType === 'MESSAGE_LIMIT') {
      setShowUpgradeModal(true);
      setShowMessagePackModal(false);
      setShowReplyModal(false);
    } else if (errorType === 'TIMEOUT_ERROR') {
      setShowTryAgainModal(true);
      setShowReplyModal(false);
    } else if (response) {
      setShowReplyModal(true);
      setShowMessagePackModal(false);
      handleCopyToClipboard();
      if (selectedMatch) {
        updateMatchLastUsed(selectedMatch.id.toString());
      }
    } else if (error && errorType !== '404') {
      setShowSnackbar(true);
    }
  }, [response, error, errorType]);

  const handleAddMatchFromSelector = async (name: string, platform: string) => {
    try {
      const newMatch = await addMatchUtil(name, platform);
      if (newMatch) {
        setMatches(prev => {
          const id = newMatch.id;
          if (prev.some(m => m.id === id)) {
            return prev.map(m => (m.id === id ? newMatch : m));
          }
          return [...prev, newMatch];
        });
      }
    } catch (error) {
      logger.app.error('Error adding match:', error);
    } finally {
      await loadMatches();
    }
  };

  const handleDeleteMatch = async (match: Match) => {
    try {
      const success = await deleteMatch(String(match.id));
      if (success) {
        removeMatch(String(match.id));
        if (selectedMatch?.id === match.id) {
          setSelectedMatch(null);
        }
      }
    } catch (error) {
      logger.app.error('Error deleting match:', error);
    }
  };

  const handleHideMatch = async (match: Match) => {
    try {
      const success = await hideMatch(match.id);
      if (success) {
        // Update local state directly without making an API call
        const updatedMatches = matches.map((m: Match) =>
          m.id === match.id ? {...m, hidden: true} : m,
        );
        setMatches(updatedMatches);
      }
    } catch (error) {
      logger.match.error('Error hiding match', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        match,
      });
    }
  };

  const handleRestoreMatch = async (match: Match) => {
    try {
      const success = await restoreMatch(match.id);
      if (success) {
        updateMatch({...match, hidden: false});
      }
    } catch (error) {
      logger.match.error('Error restoring match', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        match,
      });
    }
  };

  const removeImage = async (index: number) => {
    // Simply remove from selection without deleting
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = async (path: string): Promise<string> => {
    try {
      // We use direct axios for local file operations
      const response = await axios.get(path, {
        responseType: 'blob',
      });
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(response.data);
      });
    } catch (error) {
      logger.app.error('Error converting image to base64:', error);
      throw new Error('Failed to convert image. Please try again.');
    }
  };

  const deleteScreenshotsFromLibrary = async () => {
    if (!deleteScreenshots || images.length === 0) {
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        const assetIds = images
          .filter(img => img.assetId)
          .map(img => img.assetId!);

        if (assetIds.length > 0) {
          await CameraRoll.deletePhotos(assetIds);
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
      return;
    }

    try {
      // Check if user has hit their message limit
      const dailyCap = user?.getDailyMessageLimit() ?? 5;
      if ((user?.dailyMessagesUsed ?? 0) >= dailyCap) {
        setShowUpgradeModal(true);
        return;
      }

      setShowReplyModal(true); // Only show reply modal if user hasn't hit their limit
      await generateResponse(prompt);
    } catch (error) {
      console.error('Error generating response:', error);
      setShowSnackbar(true);
    }
  };

  const handleDone = async () => {
    await deleteScreenshotsFromLibrary();
    setImages([]);
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
    setUser({
      ...user,
      plan: tier,
      getDailyMessageLimit: () => getPlanLimits(tier),
    });
    setShowUpgradeModal(false);
    setShowPurchaseSuccess(true);
    if (user?.email === user?.installationId) {
      setShowRegistrationPrompt(true);
    }
  };

  const handleGenerateNew = () => {
    generateResponse(response || '', true);
  };

  const handlePickImages = async () => {
    await pickImages();
  };

  const handleDeleteScreenshotsToggle = (value: boolean) => {
    setDeleteScreenshots(value);
  };

  const handleMatchSelect = async (match: Match) => {
    setSelectedMatch(match);
    setShowMatchSelector(false);
    await updateMatchLastUsed(match.id.toString());

    // Update the match's lastUsed in the global store and re-sort
    (setMatches as React.Dispatch<React.SetStateAction<Match[]>>)(
      (prevMatches: Match[]) => {
        const now = new Date().toISOString();
        const updatedMatches = prevMatches.map((m: Match) =>
          String(m.id) === String(match.id) ? {...m, lastUsed: now} : m,
        );
        return [...updatedMatches].sort((a, b) =>
          (b.lastUsed || '').localeCompare(a.lastUsed || ''),
        );
      },
    );

    // Always push so each open gets a fresh CoachChat mount (navigate can pop to an
    // existing instance and leave message loading / composer in a bad state for E2E).
    navigation.push('CoachChat', {match});
  };

  const handleDeleteMatchById = (matchId: string) => {
    removeMatch(matchId);
  };

  const handleUpdateMatch = async (
    matchId: string,
    name: string,
    platform: string,
  ) => {
    try {
      await updateMatch({
        ...matches.find(m => String(m.id) === matchId)!,
        name,
        platform,
      });
      // Update the match in the global store and re-sort
      (setMatches as React.Dispatch<React.SetStateAction<Match[]>>)(
        (prevMatches: Match[]) => {
          const updatedMatches = prevMatches.map((m: Match) =>
            String(m.id) === matchId ? {...m, name, platform} : m,
          );
          return [...updatedMatches].sort((a, b) =>
            (b.lastUsed || '').localeCompare(a.lastUsed || ''),
          );
        },
      );
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  const handleTryAgain = () => {
    setShowTryAgainModal(false);
    generateResponse(prompt);
  };

  return (
    <View style={styles.container} testID="response-generator-container">
      <PhotoAccessBanner
        visible={showPermissionError}
        onDismiss={() => setShowPermissionError(false)}
        onOpenSettings={openSettings}
      />
      <View style={styles.contentContainer}>
        <Section style={styles.mainContent} contentStyle={styles.sectionBody}>
          <ImageSelector
            images={images}
            onRemoveImage={removeImage}
            onPickImages={handlePickImages}
            userPlan={user?.plan}
            onPermissionError={() => setShowPermissionError(true)}
          />

          <View
            style={[
              styles.actionsContainer,
              images.length > 0 && {
                width: screenshotTileWidth,
                alignSelf: 'center',
              },
            ]}>
            {images.length > 0 ? (
              <CharmrButton
                testID="generate-response-button"
                label="Generate reply"
                variant="heroEmphasis"
                fullWidth
                onPress={handleSubmit}
              />
            ) : (
              <AppText variant="caption" color="heroMuted" style={styles.hintText}>
                Pick a screenshot first, then tap Generate reply.
              </AppText>
            )}
          </View>

          <MatchSelectorModal
            key={(matches ?? []).map(m => m.id).join(',')}
            visible={showMatchSelector}
            onDismiss={() => setShowMatchSelector(false)}
            matches={matches ?? []}
            selectedMatch={selectedMatch}
            onSelectMatch={handleMatchSelect}
            onAddMatch={handleAddMatchFromSelector}
            onDeleteMatch={handleDeleteMatchById}
            onHideMatch={handleHideMatch}
            onRestoreMatch={handleRestoreMatch}
            onUpdateMatch={handleUpdateMatch}
            userPlan={user?.plan || SubscriptionTier.FREE}
          />
        </Section>
      </View>

      {/* Modals */}
      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => {
          setShowUpgradeModal(false);
          setShowScreenshotUpgrade(false);
        }}
        onUpgrade={handleUpgrade}
        showRateLimitMessage={errorType === 'MESSAGE_LIMIT'}
        showScreenshotMessage={showScreenshotUpgrade}
      />

      <ReplyModal
        visible={showReplyModal}
        onDismiss={() => setShowReplyModal(false)}
        reply={response || ''}
        onDone={handleDone}
        onCopy={handleCopyToClipboard}
        onDeleteScreenshots={handleDeleteScreenshotsToggle}
        deleteScreenshots={deleteScreenshots}
        hasScreenshots={images.length > 0}
        onRegenerate={handleGenerateNew}
        loading={loading}
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

      <PermissionHelpModal
        visible={showPermissionHelp}
        onDismiss={() => setShowPermissionHelp(false)}
      />

      <PurchaseSuccessModal
        visible={showPurchaseSuccess}
        onDismiss={() => {
          setShowPurchaseSuccess(false);
          setShowRegistrationPrompt(false);
        }}
        showRegistrationPrompt={showRegistrationPrompt}
        onRegisterPress={() => {
          setShowPurchaseSuccess(false);
          setShowLoginModal(true);
        }}
      />

      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={() => {
          setShowLoginModal(false);
          navigation.navigate('Home');
        }}
        onLoadingChange={setIsLoading}
        handleProviderLogin={handleProviderLogin}
      />

      <TryAgainModal
        visible={showTryAgainModal}
        onDismiss={() => setShowTryAgainModal(false)}
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
  mainContent: {
    flex: 1,
    paddingHorizontal: tokens.space.lg,
  },
  sectionBody: {
    flex: 1,
    gap: tokens.space.md,
    paddingTop: tokens.space.sm,
  },
  actionsContainer: {
    alignSelf: 'stretch',
    gap: tokens.space.sm,
    paddingBottom: Platform.OS === 'ios' ? tokens.space.sm : tokens.space.md,
  },
  hintText: {
    textAlign: 'center',
    paddingVertical: tokens.space.xs,
  },
});

export default ResponseGenerator;
