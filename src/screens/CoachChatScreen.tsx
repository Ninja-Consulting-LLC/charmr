import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {GiftedChat, IMessage as GiftedIMessage} from 'react-native-gifted-chat';
import LinearGradient from 'react-native-linear-gradient';
import {IconButton, SegmentedButtons, Snackbar, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import MatchSelectorModal from '../components/MatchSelector';
import MessagePackModal from '../components/MessagePackModal';
import PhotoAccessBanner from '../components/PhotoAccessBanner';
import TypingIndicator from '../components/TypingIndicator';
import UpgradeModal from '../components/UpgradeModal';
import {useImagePicker} from '../hooks/useImagePicker';
import {RootStackParamList} from '../navigation/types';
import {generateReply} from '../services/api';
import axiosInstance from '../services/axiosInstance';
import {deleteMatch, hideMatch, restoreMatch} from '../services/matchService';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {
  MessageMode,
  MessageRole,
  MessageType,
  SubscriptionTier,
} from '../types/enums';
import {Message} from '../types/message';
import {compressImages} from '../utils/imageCompression';
import {Match, addMatch} from '../utils/matchUtils';

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
  const {userId, matches, user, setUser, setMatches, setSelectedMatch} =
    useStore();
  const [useDebugMatch, setUseDebugMatch] = useState(
    debugMatchId === DEBUG_MATCH_ID,
  );
  const [copiedMessageId, setCopiedMessageId] = useState<
    string | number | null
  >(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        navigation.setParams({match: newMatch});
      }
    } catch (error) {
      console.error('Error adding match:', error);
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
        // Update local state to reflect the restored status
        setMatches(
          matches.map(m => (m.id === match.id ? {...m, hidden: false} : m)),
        );
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error restoring match:', error);
    }
  };

  // Use debug match ID if provided and enabled, otherwise use the match from route params
  const effectiveMatchId = useDebugMatch ? DEBUG_MATCH_ID : match.id;

  const PAGE_SIZE = 20;

  const loadMessages = useCallback(
    async (offset = 0) => {
      try {
        if (offset === 0) {
          setIsLoadingMessages(true);
        } else {
          setIsLoadingMore(true);
        }

        console.log('Loading messages with offset:', offset);
        console.log('User plan:', user?.plan, 'Type:', typeof user?.plan);
        console.log('User object:', JSON.stringify(user, null, 2));

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
        console.log('Pagination info:', {
          offset,
          limit: PAGE_SIZE,
          total,
          receivedMessages: messagesData.length,
          hasMore: offset + PAGE_SIZE < total,
        });

        // Filter out system/summary messages and deduplicate by id
        const seenIds = new Set();
        const chatMessages: IMessageWithImages[] = messagesData
          .filter(
            (msg: Message) =>
              msg.role !== MessageRole.SYSTEM &&
              msg.type !== MessageType.SUMMARY,
          )
          .filter((msg: Message) => {
            if (seenIds.has(msg.id)) return false;
            seenIds.add(msg.id);
            return true;
          })
          .map((msg: Message) => {
            console.log('Processing message:', {
              id: msg.id,
              type: msg.type,
              hasImageData: !!msg.imageData,
              content: msg.content,
            });

            return {
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
            };
          });

        console.log(
          'Processed chat messages:',
          JSON.stringify(chatMessages, null, 2),
        );

        // Add welcome message at the beginning if this is the first page
        if (offset === 0) {
          const welcomeMessage: IMessageWithImages = {
            _id: Date.now(),
            text: `Hi! I'm your dating coach. I'll help you craft the perfect responses for ${match.name}. What would you like to say? (You can also upload a screenshot of the conversation)`,
            createdAt: new Date(),
            user: {
              _id: 'coach',
              name: 'Coach',
              avatar: '👨‍🏫',
            },
            type: MessageType.TEXT,
            mode: MessageMode.COACH,
          };

          console.log('Showing all messages');
          setMessages(prevMessages => {
            const messages = [welcomeMessage, ...chatMessages];
            return messages.reverse();
          });
        } else {
          // If this is the last page (no more messages after this), add the welcome message
          const isLastPage = offset + PAGE_SIZE >= total;
          const welcomeMessage: IMessageWithImages = {
            _id: Date.now(),
            text: `Hi! I'm your dating coach. I'll help you craft the perfect responses for ${match.name}. What would you like to say? (You can also upload a screenshot of the conversation)`,
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
            const newMessages = chatMessages.reverse();
            const messages = GiftedChat.prepend(prevMessages, newMessages);
            return isLastPage
              ? GiftedChat.prepend(messages, [welcomeMessage])
              : messages;
          });
        }

        // Update hasMoreMessages based on total count
        setHasMoreMessages(offset + PAGE_SIZE < total);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        // Add welcome message as fallback only for first page
        if (offset === 0) {
          const welcomeMessage: IMessageWithImages = {
            _id: Date.now(),
            text: `Hi! I'm your dating coach. I'll help you craft the perfect responses for ${match.name}. What would you like to say? (You can also upload a screenshot of the conversation)`,
            createdAt: new Date(),
            user: {
              _id: 'coach',
              name: 'Coach',
              avatar: '👨‍🏫',
            },
            type: MessageType.TEXT,
            mode: MessageMode.COACH,
          };
          setMessages([welcomeMessage]);
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
    // Set up the header
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text style={styles.headerName}>{match.name}</Text>
          <Text style={styles.headerPlatform}>{match.platform}</Text>
        </View>
      ),
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.surface}
        />
      ),
      headerRight: () => (
        <IconButton
          icon="pencil"
          size={24}
          onPress={() => setShowMatchSelector(true)}
          iconColor={theme.colors.surface}
        />
      ),
    });

    // Load initial messages
    loadMessages();
  }, [navigation, match.name, match.platform, loadMessages]);

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
          const compressedImages = await compressImages(
            images.map(img => img.path),
          );
          base64Images = compressedImages.map(img => img.base64);
        } catch (error) {
          console.error('Error compressing images:', error);
          setIsTyping(false);
          setMessages(previousMessages =>
            GiftedChat.append(previousMessages, [
              {
                _id: Date.now() + 2,
                text: 'Failed to process images. Please try again.',
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
          setShowMessagePackModal(true);
          return;
        }

        // Update user state with new message limits
        if (response.limits) {
          setUser({
            dailyMessagesUsed: response.limits.dailyMessagesUsed,
            extraMessages: response.limits.extraMessages,
          });
        }

        const aiResponse: IMessageWithImages = {
          _id: Date.now() + 1,
          text: response.reply || response.error || 'No reply',
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

        // Restore the last used mode after sending
        setSelectedMode(lastUsedMode);
      } catch (err: any) {
        setIsTyping(false);
        if (err.response?.data?.type === 'MESSAGE_LIMIT') {
          setShowMessagePackModal(true);
          return;
        }
        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [
            {
              _id: Date.now() + 2,
              text: 'Failed to get a reply from the server.',
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
        // Restore the last used mode even if there's an error
        setSelectedMode(lastUsedMode);
      }
    },
    [
      images,
      setImages,
      selectedMode,
      userId,
      effectiveMatchId,
      setUser,
      lastUsedMode,
    ],
  );

  const handleCopyMessage = useCallback(
    (text: string, messageId: string | number) => {
      Clipboard.setString(text);
      console.log('Copying message with id:', messageId);
      setShowCopiedSnackbar(true);
    },
    [],
  );

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      />
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.headerSpacer} />
        <PhotoAccessBanner
          visible={showPermissionError}
          onDismiss={() => setShowPermissionError(false)}
          onOpenSettings={openSettings}
          topOffset={75} // Standard header height
        />
        {user?.plan === SubscriptionTier.FREE && (
          <TouchableOpacity
            style={styles.promoContainer}
            onPress={() => setShowUpgradeModal(true)}>
            <Text style={styles.promoText}>
              Upgrade to Pro to full chat history
            </Text>
            <IconButton
              icon="chevron-right"
              size={20}
              iconColor="rgba(255, 255, 255, 0.8)"
              style={styles.promoIcon}
            />
          </TouchableOpacity>
        )}
        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.surface} />
          </View>
        ) : (
          <GiftedChat
            messages={messages}
            text={text}
            onInputTextChanged={setText}
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
              console.log('Rendering bubble for message:', {
                id: currentMessage?._id,
                type: currentMessage?.type,
                hasImages: !!currentMessage?.images,
                imageCount: currentMessage?.images?.length,
                text: currentMessage?.text,
              });

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
              const isCoachMessage = currentMessage?.mode === MessageMode.COACH;

              let showCopiedText = copiedMessageId === currentMessage?._id;
              if (showCopiedText) {
                console.log(
                  'Rendering copied message text for id:',
                  currentMessage?._id,
                );
              }

              return (
                <TouchableOpacity
                  onPress={() =>
                    isCopyable &&
                    currentMessage?.text &&
                    handleCopyMessage(currentMessage.text, currentMessage._id)
                  }
                  activeOpacity={isCopyable ? 0.7 : 1}>
                  <View
                    style={[
                      styles.bubble,
                      currentMessage?.user._id === 'user'
                        ? styles.userBubble
                        : styles.coachBubble,
                      isCoachMessage && styles.coachMessageBubble,
                    ]}>
                    {currentMessage?.type === MessageType.IMAGE &&
                      currentMessage?.images &&
                      currentMessage.images.length > 0 && (
                        <ScrollView horizontal style={styles.bubbleImagesRow}>
                          {currentMessage.images.map(
                            (uri: string, idx: number) => {
                              return (
                                <TouchableOpacity
                                  key={uri + idx}
                                  onPress={() => setPreviewImage(uri)}>
                                  <Image
                                    source={{uri}}
                                    style={styles.bubbleImage}
                                  />
                                </TouchableOpacity>
                              );
                            },
                          )}
                        </ScrollView>
                      )}
                    <View style={styles.bubbleContent}>
                      <Text
                        style={[
                          styles.bubbleText,
                          currentMessage?.user._id === 'user'
                            ? styles.userBubbleText
                            : styles.coachBubbleText,
                          isCoachMessage && styles.coachMessageText,
                        ]}>
                        {currentMessage?.text}
                      </Text>
                      {isCopyable && (
                        <IconButton
                          icon="content-copy"
                          size={16}
                          style={styles.copyButton}
                          iconColor={theme.colors.secondary}
                        />
                      )}
                    </View>
                    {shouldObscure && (
                      <View style={styles.obscureOverlay}>
                        <LinearGradient
                          colors={[
                            `${theme.colors.primary}CC`,
                            `${theme.colors.primary}FF`,
                          ]}
                          style={styles.obscureGradient}>
                          <IconButton
                            icon="lock"
                            size={20}
                            iconColor="rgba(255, 255, 255, 0.9)"
                            style={styles.obscureIcon}
                          />
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            renderActions={props => (
              <IconButton
                icon={images.length > 0 ? 'close' : 'image'}
                size={32}
                onPress={handlePickImages}
                style={{
                  marginBottom: 0,
                  marginTop: 0,
                  alignSelf: 'center',
                  padding: 0,
                  height: 44,
                  width: 44,
                }}
                iconColor={theme.colors.surface}
                accessibilityLabel={
                  images.length > 0 ? 'Remove Screenshot' : 'Add Screenshot'
                }
              />
            )}
            renderInputToolbar={props => (
              <View>
                {images.length > 0 && (
                  <View style={styles.selectedImagesRow}>
                    <TouchableOpacity
                      onPress={() => setPreviewImage(images[0].path)}
                      style={styles.selectedImageContainer}>
                      <Image
                        source={{uri: images[0].path}}
                        style={styles.bubbleImage}
                      />
                      <IconButton
                        icon="close"
                        size={16}
                        style={styles.removeImageButton}
                        iconColor={theme.colors.secondary}
                        onPress={() => setImages([])}
                      />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={styles.modeSelector}>
                  <SegmentedButtons
                    value={selectedMode}
                    onValueChange={value =>
                      setSelectedMode(value as MessageMode)
                    }
                    buttons={[
                      {
                        value: MessageMode.GENERATE,
                        label: '💬 Generate',
                        style: styles.modeButton,
                        labelStyle: styles.modeButtonLabel,
                      },
                      {
                        value: MessageMode.COACH,
                        label: 'Coach',
                        style: styles.modeButton,
                        labelStyle: styles.modeButtonLabel,
                        icon: () => (
                          <Image
                            source={require('../../assets/coach-avatar.png')}
                            style={styles.modeButtonIcon}
                          />
                        ),
                      },
                    ]}
                    theme={{
                      colors: {
                        secondaryContainer: 'rgba(255, 255, 255, 0.2)',
                        onSecondaryContainer: theme.colors.surface,
                      },
                    }}
                  />
                </View>
                <View style={styles.inputBarBackground}>
                  <View style={styles.inputToolbar}>
                    <IconButton
                      icon="image"
                      size={32}
                      onPress={handlePickImages}
                      style={styles.inputButton}
                      iconColor={theme.colors.surface}
                      accessibilityLabel="Add Screenshot"
                    />
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.inputText}
                        placeholderTextColor="rgba(255, 255, 255, 0.7)"
                        value={text}
                        onChangeText={setText}
                        placeholder="Type a message or upload screenshot(s)"
                        multiline
                      />
                      {(text.trim().length > 0 || images.length > 0) && (
                        <IconButton
                          icon="send"
                          size={28}
                          onPress={() => {
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
                          style={styles.sendButton}
                          iconColor={theme.colors.surface}
                          accessibilityLabel="Send"
                        />
                      )}
                    </View>
                  </View>
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
                  Message copied!
                </Snackbar>
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
                color={theme.colors.primary}
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
          <IconButton
            icon="close"
            size={32}
            onPress={() => setPreviewImage(null)}
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
        onSelectMatch={newMatch => {
          setShowMatchSelector(false);
          navigation.setParams({match: newMatch});
        }}
        onAddMatch={handleAddMatchFromSelector}
        onDeleteMatch={handleDeleteMatchById}
        onHideMatch={handleHideMatch}
        onRestoreMatch={handleRestoreMatch}
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
        onDismiss={() => setShowUpgradeModal(false)}
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
  headerSpacer: {
    height: 56, // Standard header height
  },
  promoContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  promoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
    width: 200,
    paddingHorizontal: 16,
  },
  headerName: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 2,
    textAlign: 'center',
  },
  headerPlatform: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  headerLeft: {
    padding: 8,
  },
  messagesContainer: {
    backgroundColor: 'transparent',
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.secondary,
    marginLeft: 'auto',
    borderBottomRightRadius: 4,
    minWidth: 80,
  },
  coachBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 'auto',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bubbleText: {
    fontSize: 16,
    flexShrink: 1,
    marginRight: 8,
  },
  userBubbleText: {
    color: theme.colors.onSurface,
  },
  coachBubbleText: {
    color: theme.colors.surface,
  },
  coachAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    overflow: 'hidden',
  },
  coachAvatarImage: {
    width: '100%',
    height: '100%',
  },
  inputToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  inputButton: {
    height: 44,
    width: 44,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  inputText: {
    flex: 1,
    color: theme.colors.surface,
    fontSize: 16,
    maxHeight: 80,
    textAlignVertical: 'center',
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    margin: 0,
    padding: 0,
    height: 44,
    width: 44,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  modeButtonLabel: {
    color: theme.colors.surface,
  },
  selectedImagesRow: {
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  selectedImageContainer: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.primary,
    zIndex: 1,
  },
  bubbleImagesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  bubbleImage: {
    width: 60,
    height: 90,
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  previewModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  gradientBorder: {
    padding: 8,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 0},
  },
  previewImage: {
    width: '90%',
    height: '80%',
    borderRadius: 20,
    backgroundColor: '#000',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {width: 0, height: 2},
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginLeft: 8,
    marginBottom: 8,
  },
  typingText: {
    marginLeft: 8,
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
  },
  modeSelector: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  permissionModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 24,
    color: theme.colors.onSurfaceVariant,
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
    color: theme.colors.tertiary,
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    padding: 10,
  },
  obscureOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  coachMessageText: {
    fontStyle: 'italic',
  },
});

export default CoachChatScreen;
