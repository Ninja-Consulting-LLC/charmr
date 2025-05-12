import React from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import {theme} from '../theme/theme';

interface PromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  prompt: string;
  onPromptChange: (text: string) => void;
  onGenerateResponse?: () => void;
  loading?: boolean;
}

const PromptModal: React.FC<PromptModalProps> = ({
  visible,
  onDismiss,
  prompt,
  onPromptChange,
  onGenerateResponse,
  loading = false,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="titleMedium" style={styles.title}>
              Add Notes
            </Text>
            <IconButton
              icon="close"
              size={20}
              onPress={onDismiss}
              style={styles.closeButton}
            />
          </View>

          {/* Prompt Input */}
          <TextInput
            value={prompt}
            onChangeText={onPromptChange}
            multiline
            numberOfLines={4}
            style={styles.promptInput}
            testID="prompt-input"
            placeholder="e.g. 'Make it flirty and playful, but keep it classy' or 'I want to say something about her hat - it's a cute red beanie and she looks really stylish in it. Maybe something about how it matches her personality?'"
            placeholderTextColor={theme.colors.secondary}
            textAlignVertical="top"
            cursorColor={theme.colors.primary}
            selectionColor={theme.colors.primary}
            textColor={theme.colors.onSurface}
            underlineColor="transparent"
            activeUnderlineColor="transparent"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="default"
            returnKeyType="default"
            blurOnSubmit={false}
          />

          {/* Action Buttons */}
          <View style={styles.actions}>
            {onGenerateResponse && (
              <Button
                mode="contained"
                onPress={onGenerateResponse}
                loading={loading}
                disabled={loading || !prompt.trim()}
                style={[styles.actionButton, styles.generateButton]}>
                Generate Response
              </Button>
            )}
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={styles.actionButton}>
              Done
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: 20,
  },
  modalContent: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  promptInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    borderRadius: 4,
    minHeight: 120,
    color: theme.colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
  generateButton: {
    backgroundColor: theme.colors.primary,
  },
});

export default PromptModal;
