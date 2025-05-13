import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useCallback, useEffect, useState} from 'react';
import {
  Clipboard,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GiftedChat,
  IMessage as GiftedIMessage,
  InputToolbar,
} from 'react-native-gifted-chat';
import {IconButton, SegmentedButtons, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import TypingIndicator from '../components/TypingIndicator';
import {useImagePicker} from '../hooks/useImagePicker';
import {RootStackParamList} from '../navigation/types';
import {theme} from '../theme/theme';

type CoachChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'CoachChat'
>;

type IMessageWithImages = GiftedIMessage & {
  images?: string[];
  mode?: 'generate' | 'coach';
};

type ChatMode = 'generate' | 'coach';

const CoachChatScreen: React.FC<CoachChatScreenProps> = ({
  navigation,
  route,
}) => {
  const {match} = route.params;
  const [messages, setMessages] = useState<IMessageWithImages[]>([]);
  const [text, setText] = useState('');
  const {images, setImages, pickImages} = useImagePicker();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('generate');

  useEffect(() => {
    // Set up the header
    navigation.setOptions({
      headerShown: true,
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <Text variant="titleMedium" style={styles.matchName}>
            {match.name}
          </Text>
          <Text variant="bodySmall" style={styles.platform}>
            {match.platform}
          </Text>
        </View>
      ),
      headerLeft: () => (
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
          iconColor={theme.colors.onSurface}
        />
      ),
    });

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
    };
    setMessages([welcomeMessage]);
  }, [navigation, match]);

  const getModeHint = (mode: ChatMode) => {
    switch (mode) {
      case 'generate':
        return 'Generating a response...';
      case 'coach':
        return 'Asking your coach...';
    }
  };

  const getModeIcon = (mode: ChatMode) => {
    switch (mode) {
      case 'generate':
        return '💬';
      case 'coach':
        return '👨‍🏫';
    }
  };

  const onSend = useCallback(
    (newMessages: IMessageWithImages[] = []) => {
      // Attach images and mode to the message
      const messageWithImages: IMessageWithImages[] = newMessages.map(msg => ({
        ...msg,
        images: images.length > 0 ? images.map(img => img.path) : undefined,
        mode: selectedMode,
      }));
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, messageWithImages),
      );
      setText('');
      setImages([]); // Clear screenshots after sending

      // Show typing indicator
      setIsTyping(true);

      // Simulate AI coach response after a short delay
      setTimeout(() => {
        setIsTyping(false);
        const aiResponse: IMessageWithImages = {
          _id: Date.now() + 1,
          text: 'Interesting move! Want me to rewrite that in a flirty tone?',
          createdAt: new Date(),
          user: {
            _id: 'coach',
            name: 'Coach',
            avatar: getModeIcon(selectedMode) as string,
          },
          mode: selectedMode,
        };
        setMessages(previousMessages =>
          GiftedChat.append(previousMessages, [aiResponse]),
        );
      }, 2000);
    },
    [images, setImages, selectedMode],
  );

  const handleCopyMessage = useCallback((text: string) => {
    Clipboard.setString(text);
    // You might want to add a toast notification here
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
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
              <Text style={styles.typingText}>{getModeHint(selectedMode)}</Text>
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
            currentMessage?.mode === 'generate';

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
                {currentMessage?.images && currentMessage.images.length > 0 && (
                  <ScrollView horizontal style={styles.bubbleImagesRow}>
                    {currentMessage.images.map((uri: string, idx: number) => (
                      <TouchableOpacity
                        key={uri + idx}
                        onPress={() => setPreviewImage(uri)}>
                        <Image source={{uri}} style={styles.bubbleImage} />
                      </TouchableOpacity>
                    ))}
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
                      iconColor={theme.colors.onSurfaceVariant}
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
            onPress={pickImages}
            style={{
              marginBottom: 0,
              marginTop: 0,
              alignSelf: 'center',
              padding: 0,
              height: 44,
              width: 44,
            }}
            accessibilityLabel="Add Screenshot"
          />
        )}
        renderInputToolbar={props => (
          <View>
            <View style={styles.modeSelector}>
              <SegmentedButtons
                value={selectedMode}
                onValueChange={value => setSelectedMode(value as ChatMode)}
                buttons={[
                  {
                    value: 'generate',
                    label: '💬 Generate',
                    style: styles.modeButton,
                  },
                  {
                    value: 'coach',
                    label: 'Coach',
                    style: styles.modeButton,
                    icon: () => (
                      <Image
                        source={require('../../assets/coach-avatar.png')}
                        style={styles.modeButtonIcon}
                      />
                    ),
                  },
                ]}
              />
            </View>
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
                      onPress={() =>
                        setImages(images.filter((_, i) => i !== idx))
                      }
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <InputToolbar {...props} containerStyle={styles.inputToolbar} />
          </View>
        )}
        renderSend={props => {
          const hasText = text && text.trim().length > 0;
          const hasImages = images.length > 0;
          if (!hasText && !hasImages) return null;
          return (
            <View
              style={{
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}>
              <IconButton
                icon="send"
                size={28}
                onPress={() => {
                  const message = {
                    _id: Date.now(),
                    text: text,
                    createdAt: new Date(),
                    user: {_id: 'user'},
                    images: hasImages ? images.map(img => img.path) : undefined,
                  };
                  onSend([message]);
                }}
                style={{marginHorizontal: 4}}
                accessibilityLabel="Send"
              />
            </View>
          );
        }}
        messagesContainerStyle={[
          styles.messagesContainer,
          {paddingBottom: 36}, // More gap above input bar
        ]}
        renderTime={() => null}
        renderDay={() => null}
      />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerTitle: {
    alignItems: 'center',
  },
  matchName: {
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  platform: {
    color: theme.colors.onSurfaceVariant,
  },
  messagesContainer: {
    backgroundColor: theme.colors.background,
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    marginLeft: 'auto',
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: theme.colors.surface,
    marginRight: 'auto',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  bubbleText: {
    fontSize: 16,
    flexShrink: 1,
    marginRight: 8,
  },
  userBubbleText: {
    color: theme.colors.surface,
  },
  coachBubbleText: {
    color: theme.colors.onSurface,
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
    minHeight: 48,
    maxHeight: 60,
    paddingHorizontal: 8,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  selectedImagesRow: {
    paddingVertical: 4,
    paddingLeft: 16,
    paddingRight: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.surface,
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
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  modeButton: {
    flex: 1,
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
  modeButtonIcon: {
    width: 20,
    height: 20,
  },
});

export default CoachChatScreen;
