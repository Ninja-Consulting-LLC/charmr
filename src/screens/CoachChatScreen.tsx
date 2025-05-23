import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {
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
import {Button, IconButton, SegmentedButtons, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import TypingIndicator from '../components/TypingIndicator';
import {config} from '../config/config';
import {useImagePicker} from '../hooks/useImagePicker';
import {RootStackParamList} from '../navigation/types';
import {generateReply, testContext} from '../services/api';
import {useStore} from '../store';
import {theme} from '../theme/theme';
import {MessageMode, MessageRole, MessageType} from '../types/enums';
import {Message} from '../types/message';
import {compressImages} from '../utils/imageCompression';

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
  const [selectedMode, setSelectedMode] = useState<MessageMode>(
    MessageMode.GENERATE,
  );
  const [showPermissionError, setShowPermissionError] = useState(false);
  const {userId} = useStore();
  const [isDevMode, setIsDevMode] = useState(__DEV__);
  const [useDebugMatch, setUseDebugMatch] = useState(
    debugMatchId === DEBUG_MATCH_ID,
  );

  // Use debug match ID if provided and enabled, otherwise use the match from route params
  const effectiveMatchId = useDebugMatch ? DEBUG_MATCH_ID : match.id;

  useEffect(() => {
    // Set up the header
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text variant="headlineSmall" style={styles.matchName}>
            {match.name}
          </Text>
          <Text variant="bodySmall" style={styles.platform}>
            {match.platform}
          </Text>
          {isDevMode && (
            <Text variant="labelSmall" style={styles.devBadge}>
              🧪 Dev Mode
            </Text>
          )}
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
      headerStyle: {
        backgroundColor: 'transparent',
      },
    });

    // In dev mode, seed test data if using debug match
    if (isDevMode && effectiveMatchId === DEBUG_MATCH_ID) {
      const seedTestData = async () => {
        try {
          const response = await testContext();
          // Add initial welcome message
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

          // Fetch messages from the test context
          try {
            const messagesResponse = await fetch(
              `${config.apiBaseUrl}/api/users/${response.userId}/matches/${response.matchId}/messages`,
              {
                headers: {
                  'X-Auth-Bypass': 'true',
                  'X-Anonymous-User': response.userId,
                },
              },
            );
            if (!messagesResponse.ok) {
              throw new Error(
                `Failed to fetch messages: ${messagesResponse.status}`,
              );
            }
            const messagesData = await messagesResponse.json();

            // Convert backend messages to GiftedChat format
            const chatMessages: IMessageWithImages[] = messagesData.map(
              (msg: Message) => ({
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
                images:
                  msg.type === MessageType.IMAGE ? [msg.content] : undefined,
              }),
            );

            // Add welcome message at the beginning
            setMessages([welcomeMessage, ...chatMessages]);
          } catch (error) {
            console.error('Failed to fetch test messages:', error);
            // Fallback to just showing welcome message
            setMessages([welcomeMessage]);
          }
        } catch (error) {
          console.error('Failed to seed test data:', error);
        }
      };
      seedTestData();
    } else {
      // Add initial welcome message for non-dev mode
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
  }, [navigation, match, isDevMode, effectiveMatchId, useDebugMatch]);

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

      // Convert images to base64
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
          prompt:
            newMessages[0]?.text || 'Generate a response based on the images',
          images: base64Images,
          userId,
          matchId: String(effectiveMatchId),
        });
        setIsTyping(false);
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
      } catch (err) {
        setIsTyping(false);
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
      }
    },
    [images, setImages, selectedMode, userId, effectiveMatchId],
  );

  const handleCopyMessage = useCallback((text: string) => {
    Clipboard.setString(text);
    // You might want to add a toast notification here
  }, []);

  const handlePickImages = async () => {
    try {
      setShowPermissionError(false);
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
            const isCopyable =
              currentMessage?.user._id === 'coach' &&
              currentMessage?.mode === MessageMode.GENERATE;

            return (
              <TouchableOpacity
                onPress={() =>
                  isCopyable &&
                  currentMessage?.text &&
                  handleCopyMessage(currentMessage.text)
                }
                activeOpacity={isCopyable ? 0.7 : 1}>
                <View
                  style={[
                    styles.bubble,
                    currentMessage?.user._id === 'user'
                      ? styles.userBubble
                      : styles.coachBubble,
                  ]}>
                  {currentMessage?.images &&
                    currentMessage.images.length > 0 && (
                      <ScrollView horizontal style={styles.bubbleImagesRow}>
                        {currentMessage.images.map(
                          (uri: string, idx: number) => (
                            <TouchableOpacity
                              key={uri + idx}
                              onPress={() => setPreviewImage(uri)}>
                              <Image
                                source={{uri}}
                                style={styles.bubbleImage}
                              />
                            </TouchableOpacity>
                          ),
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
                </View>
              </TouchableOpacity>
            );
          }}
          renderActions={props => (
            <IconButton
              icon="image"
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
              accessibilityLabel="Add Screenshot"
            />
          )}
          renderInputToolbar={props => (
            <View>
              {images.length > 0 && (
                <ScrollView
                  horizontal
                  style={styles.selectedImagesRow}
                  contentContainerStyle={styles.selectedImagesContent}>
                  {images.map((img, idx) => (
                    <TouchableOpacity
                      key={img.path}
                      onPress={() => setPreviewImage(img.path)}>
                      <Image
                        source={{uri: img.path}}
                        style={styles.bubbleImage}
                      />
                      <IconButton
                        icon="close"
                        size={16}
                        style={styles.removeImageButton}
                        iconColor={theme.colors.secondary}
                        onPress={() =>
                          setImages(images.filter((_, i) => i !== idx))
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {isDevMode && (
                <View style={styles.debugToggleContainer}>
                  <TouchableOpacity
                    onPress={() => setUseDebugMatch(!useDebugMatch)}
                    style={styles.debugToggle}>
                    <IconButton
                      icon={useDebugMatch ? 'test-tube' : 'test-tube-off'}
                      size={24}
                      iconColor={theme.colors.tertiary}
                      style={styles.debugToggleIcon}
                    />
                    <Text style={styles.debugToggleText}>
                      {useDebugMatch ? 'Debug Match' : 'Regular Match'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.modeSelector}>
                <SegmentedButtons
                  value={selectedMode}
                  onValueChange={value => setSelectedMode(value as MessageMode)}
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
          )}
          messagesContainerStyle={[
            styles.messagesContainer,
            {paddingBottom: 36}, // More gap above input bar
          ]}
          renderTime={() => null}
          renderDay={() => null}
        />
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
      {/* Permission error modal */}
      <Modal
        visible={showPermissionError}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissionError(false)}>
        <View style={styles.permissionModal}>
          <View style={styles.permissionContent}>
            <Text style={styles.permissionTitle}>Photo Access Required</Text>
            <Text style={styles.permissionText}>
              Please grant photo access to add screenshots
            </Text>
            <View style={styles.permissionButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowPermissionError(false)}
                style={styles.permissionButton}>
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  openSettings();
                  setShowPermissionError(false);
                }}
                style={styles.permissionButton}>
                Open Settings
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  matchName: {
    color: theme.colors.surface,
    fontWeight: 'bold',
    fontSize: 24,
    marginBottom: 2,
    textAlign: 'center',
  },
  platform: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
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
    alignItems: 'flex-end',
    minHeight: 48,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    margin: 0,
    padding: 0,
    height: 44,
    width: 44,
    alignSelf: 'flex-end',
  },
  inputText: {
    flex: 1,
    color: theme.colors.surface,
    fontSize: 16,
    marginHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 100,
  },
  sendButton: {
    margin: 0,
    padding: 0,
    height: 44,
    width: 44,
    alignSelf: 'flex-end',
  },
  modeButton: {
    flex: 1,
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
  selectedImagesContent: {
    alignItems: 'center',
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
  debugToggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  debugToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 8,
  },
  debugToggleIcon: {
    margin: 0,
    padding: 0,
  },
  debugToggleText: {
    color: theme.colors.tertiary,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CoachChatScreen;
