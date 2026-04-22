import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {GiftedChat, IMessage as GiftedIMessage} from 'react-native-gifted-chat';
import LinearGradient from 'react-native-linear-gradient';
import {Snackbar} from 'react-native-paper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MatchSelectorModal from '../components/MatchSelector';
import MessagePackModal from '../components/MessagePackModal';
import PhotoAccessBanner from '../components/PhotoAccessBanner';
import TypingIndicator from '../components/TypingIndicator';
import UpgradeModal from '../components/UpgradeModal';
import {config} from '../config/config';
import {useImagePicker} from '../hooks/useImagePicker';
import {RootStackParamList} from '../navigation/types';
import {generateReply} from '../services/api';
import axiosInstance from '../services/axiosInstance';
import {
  deleteMatch,
  hideMatch,
  restoreMatch,
  updateMatch,
  updateMatchLastUsed as updateMatchLastUsedService,
} from '../services/matchService';
import {useStore} from '../store';
import {
  AppText,
  CharmrButton,
  HeroChromeIconButton,
  ModalIconButton,
  TopBar,
  tokens,
} from '../design-system';
import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';
import {Message} from '../types/message';
import {Match, addMatch} from '../utils/matchUtils';
import {getPlanLimits} from '../utils/planLimits';

type CoachChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachChat'
>;

type IMessageWithImages = GiftedIMessage & {
  images?: string[];
  mode?: MessageMode;
  type?: MessageType;
};

const DEBUG_MATCH_ID = 'debug-match';

const CoachChatScreen: React.FC<CoachChatScreenProps> = ({
  navigation,
  route,
}) => {
  const {match, debugMatchId} = route.params;
  const [messages, setMessages] = useState<IMessageWithImages[]>([]);
  const [text, setText] = useState('');
  const {images, setImages, pickImages, openSettings} = useImagePicker();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [selectedMode, setSelectedMode] = useState<MessageMode>(
    MessageMode.GENERATE,
  );
  const [lastUsedMode, setLastUsedMode] = useState<MessageMode>(
    MessageMode.GENERATE,
  );
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [showMatchSelector, setShowMatchSelector] = useState(false);
  const [showMessagePackModal, setShowMessagePackModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCopiedSnackbar, setShowCopiedSnackbar] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const insets = useSafeAreaInsets();
  const {
    userId,
    matches,
    user,
    setUser,
    setMatches,
    setSelectedMatch,
    loadMatches,
  } = useStore();
  const [useDebugMatch, setUseDebugMatch] = useState(
    debugMatchId === DEBUG_MATCH_ID,
  );
  // Clear match selection when navigating back
  useEffect(() => {
    return () => {
      setSelectedMatch(null);
    };
  }, [setSelectedMatch]);

  const handleAddMatchFromSelector = async (name: string, platform: string) => {
    try {
      const newMatch = await addMatch(name, platform);
      if (newMatch) {
        setMatches(prev => {
          const id = newMatch.id;
          if (prev.some(m => m.id === id)) {
            return prev.map(m => (m.id === id ? newMatch : m));
          }
          return [...prev, newMatch];
        });
        navigation.setParams({match: newMatch});
      }
    } catch (error) {
      console.error('Error adding match:', error);
    } finally {
      await loadMatches();
    }
  };

  const handleDeleteMatchById = async (matchId: string) => {
    try {
      const success = await deleteMatch(matchId);
      if (success) {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  const handleHideMatch = async (match: Match) => {
    try {
      const success = await hideMatch(match.id);
      if (success) {
        // Update local state to reflect the hidden status
        setMatches(
          matches.map(m => (m.id === match.id ? {...m, hidden: true} : m)),
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error hiding match:', error);
    }
  };

  const handleRestoreMatch = async (match: Match) => {
    try {
      const success = await restoreMatch(match.id);
      if (success) {
        // Update local state directly without making an API call
        const updatedMatches = matches.map((m: Match) =>
          m.id === match.id ? {...m, hidden: false} : m,
        );
        setMatches(updatedMatches);
      }
    } catch (error) {
      console.error('Error restoring match:', error);
    }
  };

  const handleUpdateMatch = async (
    matchId: string,
    name: string,
    platform: string,
  ) => {
    try {
      const updatedMatch = await updateMatch({
        ...matches.find(m => String(m.id) === matchId)!,
        name,
        platform,
      });
      if (updatedMatch) {
        const updatedMatches = matches.map(m =>
          String(m.id) === matchId ? updatedMatch : m,
        );
        setMatches(updatedMatches);
      }
    } catch (error) {
      console.error('Error updating match:', error);
    }
  };

  // Use debug match ID if provided and enabled, otherwise use the match from route params
  const effectiveMatchId = useDebugMatch ? DEBUG_MATCH_ID : match.id;

  const PAGE_SIZE = config.chat.pageSize;

  const loadMessages = useCallback(
    async (offset = 0) => {
      try {
        if (offset === 0) {
          setIsLoadingMessages(true);
        } else {
          setIsLoadingMore(true);
        }

        const messagesResponse = await axiosInstance.get(
          `/api/users/${userId}/matches/${effectiveMatchId}/messages`,
          {
            params: {
              limit: PAGE_SIZE,
              offset,
            },
          },
        );

        const {messages: messagesData, total} = messagesResponse.data;
        // Check if this is the only page
        const isOnlyPage = total <= PAGE_SIZE;

        // Transform messages to chat format
        const chatMessages: IMessageWithImages[] = messagesData.map((msg: Message) => ({
          _id: msg.id,
          text: msg.content,
          createdAt: new Date(msg.timestamp),
          user: {
            _id: msg.role === MessageRole.USER ? 'user' : 'coach',
            name: msg.role === MessageRole.USER ? 'You' : 'Coach',
            avatar: msg.role === MessageRole.USER ? undefined : '👨‍🏫',
          },
          type: msg.type,
          mode: msg.mode,
          images: msg.imageData ? [msg.imageData] : undefined,
        }));

        // Add welcome message only on the last page or if it's the only page
        if (offset === 0) {
          if (isOnlyPage) {
            const welcomeMessage: IMessageWithImages = {
              _id: Date.now(),
              text: `Hi, I am your dating coach. I can help you write a strong reply for ${match.name}. Tell me what you want to say, or add a screenshot for context.`,
              createdAt: new Date(),
              user: {
                _id: 'coach',
                name: 'Coach',
                avatar: '👨‍🏫',
              },
              type: MessageType.TEXT,
              mode: MessageMode.COACH,
            };
            setMessages([...chatMessages, welcomeMessage]);
          } else {
            setMessages(chatMessages);
          }
        } else {
          // If this is the last page (no more messages after this), add the welcome message
          const isLastPage = offset + PAGE_SIZE >= total;
          const welcomeMessage: IMessageWithImages = {
            _id: Date.now(),
            text: `Hi, I am your dating coach. I can help you write a strong reply for ${match.name}. Tell me what you want to say, or add a screenshot for context.`,
            createdAt: new Date(),
            user: {
              _id: 'coach',
              name: 'Coach',
              avatar: '👨‍🏫',
            },
            type: MessageType.TEXT,
            mode: MessageMode.COACH,
          };

          setMessages(prevMessages => {
            const messages = GiftedChat.prepend(prevMessages, chatMessages);
            return isLastPage
              ? GiftedChat.prepend(messages, [welcomeMessage])
              : messages;
          });
        }

        // Update hasMoreMessages based on total count
        setHasMoreMessages(offset + PAGE_SIZE < total);
      } catch (error) {
        console.error('[Message Loading] Failed to fetch messages:', error);
        // Just set empty messages array on error
        if (offset === 0) {
          setMessages([]);
        }
      } finally {
        setIsLoadingMessages(false);
        setIsLoadingMore(false);
      }
    },
    [userId, effectiveMatchId, match.name, user?.plan],
  );

  const loadMoreMessages = useCallback(() => {
    if (!isLoadingMore && hasMoreMessages) {
      loadMessages(messages.length);
    }
  }, [isLoadingMore, hasMoreMessages, messages.length, loadMessages]);

  useEffect(() => {
    navigation.setOptions({headerShown: false});
    loadMessages();
  }, [navigation, loadMessages]);

  const getModeIcon = (mode: MessageMode) => {
    switch (mode) {
      case MessageMode.GENERATE:
        return '💬';
      case MessageMode.COACH:
        return '👨‍🏫';
    }
  };

  const onSend = useCallback(
    async (newMessages: IMessageWithImages[] = []) => {
      // Store the current mode before sending
      setLastUsedMode(selectedMode);

      // Attach images and mode to the message
      const messageWithImages: IMessageWithImages[] = newMessages.map(msg => ({
        ...msg,
        images: images.length > 0 ? images.map(img => img.path) : undefined,
        mode: selectedMode,
        type: images.length > 0 ? MessageType.IMAGE : MessageType.TEXT,
      }));
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, messageWithImages),
      );
      setText('');
      setImages([]); // Clear screenshots after sending

      // Show typing indicator
      setIsTyping(true);

      // Convert images to base64 for AI service
      let base64Images: string[] = [];
      if (images.length > 0) {
        try {
          base64Images = await Promise.all(
            images.map(async img => {
              const response = await fetch(img.path);
              const blob = await response.blob();
              return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }),
          );
        } catch (error) {
          console.error('Error preparing images:', error);
          setIsTyping(false);
          setMessages(previousMessages =>
            GiftedChat.append(previousMessages, [
              {
                _id: Date.now() + 2,
                text: 'We could not process that image. Please try again.',
                createdAt: new Date(),
                user: {
                  _id: 'coach',
                  name: 'Coach',
                  avatar: getModeIcon(selectedMode) as string,
                },
                mode: selectedMode,
                type: MessageType.TEXT,
              },
            ]),
          );
          return;
        }
      }

      // Call backend reply service
      try {
        const response = await generateReply({
          prompt: newMessages[0]?.text,
          images: base64Images,
          userId,
          matchId: String(effectiveMatchId),
          mode: selectedMode,
        });
        setIsTyping(false);

        if (response.type === 'MESSAGE_LIMIT') {
          setIsRateLimited(true);
          setShowUpgradeModal(true);
          return;
        }

        // Update user state with new message limits
        if (response.limits) {
          setUser({
            ...user,
            dailyMessagesUsed: response.limits.dailyMessagesUsed,
            extraMessages: response.limits.extraMessages,
            getDailyMessageLimit: () => getPlanLimits(user.plan),
          });
        }

        const aiResponse: IMessageWithImages = {
          _id: Date.now() + 1,
          text: response.reply || response.error || 'No reply yet.',
          createdAt: new Date(),
          user: {
            _id: 'coach',
            name: 'Coach',
            avatar: getModeIcon(selectedMode) as string,
          },
          mode: selectedMode,
          type: MessageType.TEXT,
        };
        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [aiResponse]),
        );
      } catch (err: any) {
        setIsTyping(false);
        if (err.response?.data?.type === 'MESSAGE_LIMIT') {
          setIsRateLimited(true);
          setShowUpgradeModal(true);
          return;
        }
        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [
            {
              _id: Date.now() + 2,
              text: 'We could not generate a reply. Please try again.',
              createdAt: new Date(),
              user: {
                _id: 'coach',
                name: 'Coach',
                avatar: getModeIcon(selectedMode) as string,
              },
              mode: selectedMode,
              type: MessageType.TEXT,
            },
          ]),
        );
      }
    },
    [images, setImages, selectedMode, userId, effectiveMatchId, setUser],
  );

  const handleCopyMessage = useCallback((text: string, _messageId: string | number) => {
    Clipboard.setString(text);
    setShowCopiedSnackbar(true);
  }, []);

  const handlePickImages = async () => {
    try {
      setShowPermissionError(false);
      // If we already have an image, clear it first
      if (images.length > 0) {
        setImages([]);
      }
      await pickImages();
    } catch (error) {
      if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
        setShowPermissionError(true);
      }
    }
  };

  const updateMatchLastUsed = async (matchId: string) => {
    try {
      const matchToUpdate = matches.find(m => m.id.toString() === matchId);
      if (!matchToUpdate) {
        console.error('Match not found when updating last used', {matchId});
        return;
      }
      await updateMatchLastUsedService(matchToUpdate.id.toString());
    } catch (error) {
      console.error('Error updating match last used', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        matchId,
      });
    }
  };

  return (
    <View style={styles.container} testID="coach-chat-screen">
      <LinearGradient
        colors={[
          tokens.color.brand.primary,
          tokens.color.brand.primaryStrong,
        ]}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View
          style={{
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}>
          <TopBar
            showDivider
            leading={
              <HeroChromeIconButton
                testID="coach-chat-back-button"
                icon="arrow-left"
                onPress={() => navigation.goBack()}
                accessibilityLabel="Back"
              />
            }
            center={
              <View style={styles.headerTitle}>
                <AppText
                  testID="coach-chat-match-name"
                  variant="titleSm"
                  color="hero"
                  numberOfLines={1}
                  style={styles.headerName}>
                  {match.name}
                </AppText>
                <AppText variant="caption" color="heroMuted" style={styles.headerPlatform}>
                  {match.platform.charAt(0).toUpperCase() + match.platform.slice(1)}
                </AppText>
              </View>
            }
            trailing={
              <HeroChromeIconButton
                icon="pencil"
                onPress={() => setShowMatchSelector(true)}
                accessibilityLabel="Change match"
              />
            }
          />
        </View>
        <PhotoAccessBanner
          visible={showPermissionError}
          onDismiss={() => setShowPermissionError(false)}
          onOpenSettings={openSettings}
          topOffset={insets.top + 56}
        />
        {(!user || user.plan === SubscriptionTier.FREE) && (
          <Pressable
            testID="coach-free-upgrade-banner"
            style={({pressed}) => [
              styles.promoContainer,
              pressed && styles.promoPressed,
              {
                paddingLeft: tokens.space.lg + insets.left,
                paddingRight: tokens.space.lg + insets.right,
              },
            ]}
            onPress={() => setShowUpgradeModal(true)}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Upgrade to Pro to unlock full chat history">
            <AppText variant="label" color="accent" style={styles.promoText}>
              Upgrade to Pro for full chat history
            </AppText>
            <Icon
              name="chevron-right"
              size={20}
              color={tokens.color.accent.mint}
              style={styles.promoIcon}
            />
          </Pressable>
        )}
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tokens.color.hero.text} />
            <AppText variant="body" color="heroMuted" style={styles.loadingLabel}>
              Loading chat...
            </AppText>
          </View>
        ) : (
          <GiftedChat
            messages={messages}
            text={text}
            onInputTextChanged={setText}
            bottomOffset={insets.bottom}
            user={{
              _id: 'user',
            }}
            isTyping={isTyping}
            renderTypingIndicator={() =>
              isTyping ? (
                <View style={styles.typingContainer}>
                  <TypingIndicator />
                </View>
              ) : null
            }
            renderChatEmpty={() => (
              <View style={styles.emptyChatContainer}>
                <AppText
                  variant="bodyMedium"
                  color="heroMuted"
                  style={styles.emptyChatText}>
                  No messages yet. Ask for a draft reply, or ask your coach for help.
                </AppText>
              </View>
            )}
            keyboardShouldPersistTaps="never"
            listViewProps={{
              keyboardDismissMode: 'on-drag',
              // @ts-ignore - onScroll is a valid prop but not in the type definition
              onScroll: () => {
                Keyboard.dismiss();
              },
            }}
            renderAvatar={props => {
              if (props.currentMessage?.user._id === 'coach') {
                return (
                  <View style={styles.coachAvatar}>
                    <Image
                      source={require('../../assets/coach-avatar.png')}
                      style={styles.coachAvatarImage}
                    />
                  </View>
                );
              }
              return null;
            }}
            renderBubble={props => {
              const {currentMessage} = props;
              const isCopyable =
                currentMessage?.user._id === 'coach' &&
                currentMessage?.mode === MessageMode.GENERATE;

              // Check if this message should be obscured for free users
              const messageIndex = messages.findIndex(
                m => m._id === currentMessage?._id,
              );
              const shouldObscure =
                user?.plan === SubscriptionTier.FREE && messageIndex >= 5;

              // Add a visual indicator for coach messages
              const isCoachMessage =
                currentMessage?.user._id === 'coach' &&
                currentMessage?.mode === MessageMode.COACH;

              return (
                <Pressable
                  onPress={() =>
                    isCopyable &&
                    currentMessage?.text &&
                    handleCopyMessage(currentMessage.text, currentMessage._id)
                  }
                  disabled={!isCopyable}
                  style={({pressed}) => [
                    isCopyable && pressed && styles.bubblePressed,
                  ]}>
                  <View
                    style={[
                      styles.bubble,
                      currentMessage?.user._id === 'user'
                        ? styles.userBubble
                        : styles.coachBubble,
                      // Only apply coachMessageBubble if it's a coach (assistant) message in coach mode
                      currentMessage?.user._id !== 'user' &&
                        isCoachMessage &&
                        styles.coachMessageBubble,
                    ]}>
                    {currentMessage?.type === MessageType.IMAGE &&
                      currentMessage?.images &&
                      currentMessage.images.length > 0 && (
                        <ScrollView horizontal style={styles.bubbleImagesRow}>
                          {currentMessage.images.map(
                            (uri: string, idx: number) => {
                              return (
                                <Pressable
                                  key={uri + idx}
                                  onPress={() => setPreviewImage(uri)}>
                                  <Image
                                    source={{uri}}
                                    style={styles.bubbleImage}
                                  />
                                </Pressable>
                              );
                            },
                          )}
                        </ScrollView>
                      )}
                    <View style={styles.bubbleContent}>
                      <AppText
                        variant="bodyMedium"
                        color="hero"
                        style={[
                          styles.bubbleText,
                          currentMessage?.user._id === 'user'
                            ? styles.userBubbleText
                            : styles.coachBubbleText,
                          currentMessage?.user._id !== 'user' &&
                            isCoachMessage &&
                            styles.coachMessageText,
                        ]}>
                        {currentMessage?.text}
                      </AppText>
                      {isCopyable && (
                        <Icon
                          name="content-copy"
                          size={16}
                          color={tokens.color.accent.mint}
                          style={styles.copyButton}
                        />
                      )}
                    </View>
                    {shouldObscure && (
                      <View style={styles.obscureOverlay}>
                        <LinearGradient
                          colors={[
                            `${tokens.color.brand.primary}CC`,
                            `${tokens.color.brand.primary}FF`,
                          ]}
                          style={styles.obscureGradient}>
                          <Icon
                            name="lock"
                            size={20}
                            color="rgba(255, 255, 255, 0.9)"
                            style={styles.obscureIcon}
                          />
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            }}
            renderActions={() => null}
            renderInputToolbar={props => (
              <View style={styles.inputToolbarRoot}>
                {(() => {
                  const canSend = text.trim().length > 0 || images.length > 0;
                  return (
                    <>
                {images.length > 0 && (
                  <View
                    style={[
                      styles.selectedImagesRow,
                      {
                        paddingLeft: tokens.space.lg + insets.left,
                        paddingRight: tokens.space.lg + insets.right,
                      },
                    ]}>
                    <Pressable
                      onPress={() => setPreviewImage(images[0].path)}
                      style={styles.selectedImageContainer}>
                      <Image
                        source={{uri: images[0].path}}
                        style={styles.bubbleImage}
                      />
                      <HeroChromeIconButton
                        icon="close"
                        iconSize={16}
                        style={styles.removeImageButton}
                        onPress={() => setImages([])}
                        accessibilityLabel="Remove screenshot"
                      />
                    </Pressable>
                  </View>
                )}
                <View style={[styles.composerColumn, styles.inputBarBackground]}>
                  <LinearGradient
                    colors={[
                      'rgba(126, 34, 206, 0)',
                      'rgba(126, 34, 206, 0.06)',
                      'rgba(126, 34, 206, 0.14)',
                      'rgba(59, 7, 100, 0.28)',
                      'rgba(59, 7, 100, 0.52)',
                      'rgba(59, 7, 100, 0.78)',
                      tokens.color.brand.primaryStrong,
                      tokens.color.brand.primaryDeep,
                    ]}
                    locations={[0, 0.14, 0.3, 0.46, 0.62, 0.76, 0.9, 1]}
                    style={styles.inputRowGradient}
                    start={{x: 0, y: 0}}
                    end={{x: 0, y: 1}}>
                    <View
                      pointerEvents="none"
                      style={styles.composerGradientTopFeather}
                    />
                    <View
                      style={[
                        styles.modeSelector,
                        {
                          paddingLeft: tokens.space.lg + insets.left,
                          paddingRight: tokens.space.lg + insets.right,
                        },
                      ]}>
                      <CharmrButton
                        label="Draft reply"
                        variant={
                          selectedMode === MessageMode.GENERATE
                            ? 'primary'
                            : 'outline'
                        }
                        onPress={() => setSelectedMode(MessageMode.GENERATE)}
                        compact
                        style={styles.modeSegment}
                      />
                      <CharmrButton
                        label="Ask coach"
                        leftIcon={
                          <Image
                            source={require('../../assets/coach-avatar.png')}
                            style={styles.modeButtonIcon}
                          />
                        }
                        variant={
                          selectedMode === MessageMode.COACH
                            ? 'primary'
                            : 'outline'
                        }
                        onPress={() => setSelectedMode(MessageMode.COACH)}
                        compact
                        style={styles.modeSegment}
                      />
                    </View>
                    <View
                      style={[
                        styles.inputToolbar,
                        {
                          paddingLeft: insets.left + tokens.space.sm,
                          paddingRight: insets.right + tokens.space.sm,
                          paddingBottom: tokens.space.sm,
                        },
                      ]}>
                      <HeroChromeIconButton
                        testID="coach-chat-add-screenshot-button"
                        icon="image"
                        iconSize={28}
                        onPress={handlePickImages}
                        style={styles.inputButton}
                        accessibilityLabel="Add screenshot"
                      />
                      <View
                        style={styles.inputContainer}
                        testID="coach-chat-composer-container">
                        <TextInput
                          testID="coach-chat-message-input"
                          style={styles.inputText}
                          placeholderTextColor={tokens.color.hero.textMuted}
                          value={text}
                          onChangeText={setText}
                          placeholder="Type a message or add a screenshot"
                          multiline
                          maxFontSizeMultiplier={tokens.a11y.maxFontSizeMultiplier}
                        />
                        <Pressable
                          testID="coach-chat-send-button"
                          onPress={() => {
                            if (!canSend) {
                              return;
                            }
                            const message = {
                              _id: Date.now(),
                              text: text,
                              createdAt: new Date(),
                              user: {_id: 'user'},
                              images:
                                images.length > 0
                                  ? images.map(img => img.path)
                                  : undefined,
                            };
                            onSend([message]);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel="Send"
                          accessibilityState={{disabled: !canSend}}
                          style={({pressed}) => [
                            styles.sendButton,
                            !canSend && styles.sendButtonDisabled,
                            pressed && canSend && styles.sendButtonPressed,
                          ]}>
                          <Icon
                            name="send"
                            size={22}
                            color={
                              canSend
                                ? tokens.color.text.onAccent
                                : tokens.color.hero.textMuted
                            }
                          />
                        </Pressable>
                      </View>
                    </View>
                  </LinearGradient>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.homeIndicatorFill,
                      {height: insets.bottom},
                    ]}
                  />
                </View>
                <Snackbar
                  visible={showCopiedSnackbar}
                  onDismiss={() => setShowCopiedSnackbar(false)}
                  duration={2000}
                  style={[
                    styles.snackbar,
                    {backgroundColor: 'rgba(0, 0, 0, 0.6)'},
                  ]}
                  action={{
                    label: 'OK',
                    onPress: () => setShowCopiedSnackbar(false),
                  }}>
                  Copied to clipboard.
                </Snackbar>
                    </>
                  );
                })()}
              </View>
            )}
            messagesContainerStyle={[
              styles.messagesContainer,
              {paddingBottom: 36}, // More gap above input bar
            ]}
            renderTime={() => null}
            renderDay={() => null}
            renderLoading={() => (
              <ActivityIndicator
                size="small"
                color={tokens.color.hero.text}
                style={styles.loadingIndicator}
              />
            )}
            infiniteScroll
            loadEarlier={hasMoreMessages}
            isLoadingEarlier={isLoadingMore}
            onLoadEarlier={loadMoreMessages}
          />
        )}
      </SafeAreaView>
      {/* Large image preview modal */}
      <Modal
        visible={!!previewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewModal}>
          {previewImage && (
            <Image
              source={{uri: previewImage}}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <ModalIconButton
            icon="close"
            size={44}
            onPress={() => setPreviewImage(null)}
            accessibilityLabel="Close preview"
            style={styles.previewCloseButton}
          />
        </View>
      </Modal>
      {/* Match Selector Modal */}
      <MatchSelectorModal
        visible={showMatchSelector}
        onDismiss={() => setShowMatchSelector(false)}
        matches={matches}
        selectedMatch={match}
        onSelectMatch={async newMatch => {
          setShowMatchSelector(false);
          await updateMatchLastUsed(newMatch.id.toString());

          // Update the match's lastUsed in the global store and re-sort
          const now = new Date().toISOString();
          (setMatches as React.Dispatch<React.SetStateAction<Match[]>>)(
            (prevMatches: Match[]) => {
              const updatedMatches = prevMatches.map((m: Match) =>
                String(m.id) === String(newMatch.id)
                  ? {...m, lastUsed: now}
                  : m,
              );
              return [...updatedMatches].sort((a, b) =>
                (b.lastUsed || '').localeCompare(a.lastUsed || ''),
              );
            },
          );

          navigation.setParams({match: newMatch});
        }}
        onAddMatch={handleAddMatchFromSelector}
        onDeleteMatch={handleDeleteMatchById}
        onHideMatch={handleHideMatch}
        onRestoreMatch={handleRestoreMatch}
        onUpdateMatch={handleUpdateMatch}
        userPlan={user?.plan || SubscriptionTier.FREE}
      />
      {/* Message Pack Modal */}
      <MessagePackModal
        visible={showMessagePackModal}
        onDismiss={() => setShowMessagePackModal(false)}
        currentBalance={user?.extraMessages || 0}
        onUpgrade={() => setShowUpgradeModal(true)}
      />
      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onDismiss={() => {
          setShowUpgradeModal(false);
          setIsRateLimited(false);
        }}
        showRateLimitMessage={isRateLimited}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  promoPressed: {
    opacity: 0.92,
  },
  promoContainer: {
    paddingVertical: tokens.space.sm,
    backgroundColor: tokens.color.hero.scrim,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border.subtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space.sm,
  },
  promoText: {
    textAlign: 'center',
  },
  promoIcon: {
    margin: 0,
    padding: 0,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  headerTitle: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    maxWidth: 200,
    paddingHorizontal: tokens.space.sm,
  },
  bubblePressed: {
    opacity: 0.88,
  },
  headerName: {
    marginBottom: tokens.space.xxs,
    textAlign: 'center',
  },
  headerPlatform: {
    textAlign: 'center',
  },
  messagesContainer: {
    backgroundColor: 'transparent',
  },
  bubble: {
    maxWidth: '85%',
    padding: tokens.space.md,
    borderRadius: tokens.radii.lg,
    marginVertical: tokens.space.xs,
  },
  userBubble: {
    backgroundColor: tokens.color.accent.mint,
    marginLeft: 'auto',
    borderBottomRightRadius: tokens.radii.xs,
    minWidth: 80,
  },
  coachBubble: {
    backgroundColor: tokens.color.hero.glass,
    marginRight: 'auto',
    borderBottomLeftRadius: tokens.radii.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
  },
  bubbleText: {
    fontSize: tokens.type.body.size,
    flexShrink: 1,
    marginRight: tokens.space.sm,
  },
  userBubbleText: {
    color: tokens.color.text.onAccent,
  },
  coachBubbleText: {
    color: tokens.color.hero.text,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.color.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: tokens.space.sm,
    overflow: 'hidden',
  },
  coachAvatarImage: {
    width: '100%',
    height: '100%',
  },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    backgroundColor: 'transparent',
  },
  inputButton: {
    height: 44,
    width: 44,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: tokens.space.sm,
    paddingLeft: tokens.space.sm,
    paddingRight: tokens.space.xxs,
  },
  inputText: {
    flex: 1,
    color: tokens.color.hero.text,
    fontSize: tokens.type.bodyMedium.size,
    maxHeight: 96,
    textAlignVertical: 'center',
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.sm,
    paddingRight: tokens.space.xs,
    backgroundColor: 'transparent',
  },
  sendButton: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.accent.mint,
  },
  sendButtonDisabled: {
    backgroundColor: tokens.color.hero.glass,
  },
  sendButtonPressed: {
    opacity: 0.85,
  },
  modeSegment: {
    flex: 1,
  },
  selectedImagesRow: {
    paddingVertical: tokens.space.xs,
    marginBottom: tokens.space.md,
    backgroundColor: 'transparent',
  },
  selectedImageContainer: {
    position: 'relative',
    marginRight: tokens.space.sm,
  },
  selectedImage: {
    width: 48,
    height: 48,
    borderRadius: tokens.radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
  },
  removeImageButton: {
    position: 'absolute',
    top: -tokens.space.sm,
    right: -tokens.space.sm,
    backgroundColor: tokens.color.brand.primary,
    zIndex: 1,
  },
  bubbleImagesRow: {
    flexDirection: 'row',
    marginBottom: tokens.space.xs,
  },
  bubbleImage: {
    width: 60,
    height: 90,
    borderRadius: tokens.radii.xs,
    marginRight: tokens.space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.hero.glassBorder,
  },
  previewModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.color.overlay.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gradientBorder: {
    padding: tokens.space.sm,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    margin: tokens.space.sm,
    shadowColor: tokens.color.accent.mint,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 0},
  },
  previewImage: {
    width: '90%',
    height: '80%',
    borderRadius: tokens.radii.xl,
    backgroundColor: tokens.color.canvas.default,
  },
  previewCloseButton: {
    position: 'absolute',
    top: tokens.space['4xl'],
    right: tokens.space.lg,
    zIndex: 1001,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space.sm,
    marginLeft: tokens.space.sm,
    marginBottom: tokens.space.sm,
  },
  typingText: {
    marginLeft: tokens.space.sm,
    color: tokens.color.hero.textSubtle,
    fontSize: tokens.type.caption.size,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: tokens.space.sm,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.sm,
    backgroundColor: 'transparent',
  },
  modeButtonIcon: {
    width: 20,
    height: 20,
  },
  bubbleContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
  },
  copyButton: {
    margin: 0,
    padding: 0,
    alignSelf: 'flex-end',
    marginLeft: 4,
  },
  inputBarBackground: {
    width: '100%',
    alignSelf: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.color.border.subtle,
    paddingTop: tokens.space.xs,
  },
  inputRowGradient: {
    width: '100%',
    alignSelf: 'stretch',
  },
  composerGradientTopFeather: {
    width: '100%',
    height: tokens.space['2xl'],
  },
  inputToolbarRoot: {
    width: '100%',
    alignSelf: 'stretch',
  },
  composerColumn: {
    width: '100%',
    alignSelf: 'stretch',
  },
  homeIndicatorFill: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: tokens.color.brand.primaryDeep,
  },
  permissionModal: {
    flex: 1,
    backgroundColor: tokens.color.overlay.heavy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    backgroundColor: tokens.color.surface.inverse,
    borderRadius: tokens.radii.md,
    padding: tokens.space['2xl'],
    width: '80%',
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: tokens.type.titleSm.size,
    fontWeight: '700',
    marginBottom: tokens.space.md,
    color: tokens.color.text.onInverse,
  },
  permissionText: {
    fontSize: tokens.type.body.size,
    marginBottom: tokens.space['2xl'],
    color: tokens.color.text.onInverseMuted,
  },
  permissionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  permissionButton: {
    minWidth: 100,
  },
  devBadge: {
    color: tokens.color.text.tertiary,
    fontSize: tokens.type.caption.size,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  loadingLabel: {
    textAlign: 'center',
  },
  loadingIndicator: {
    padding: 10,
  },
  emptyChatContainer: {
    paddingHorizontal: tokens.space['2xl'],
    paddingVertical: tokens.space.lg,
  },
  emptyChatText: {
    textAlign: 'center',
  },
  obscureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: tokens.radii.lg,
    overflow: 'hidden',
  },
  obscureGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  obscureIcon: {
    margin: 0,
    padding: 0,
  },
  snackbar: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 8,
  },
  coachMessageBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: tokens.color.border.strong,
  },
  coachMessageText: {
    fontStyle: 'italic',
  },
});

export default CoachChatScreen;
