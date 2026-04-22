import React, {useRef, useState} from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import {Modal, Snackbar, TextInput, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';

interface AddEditMatchModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddMatch: (name: string, platform: string) => Promise<void>;
  isEditing?: boolean;
  initialName?: string;
  initialPlatform?: string;
  onUpdateMatch?: (name: string, platform: string) => Promise<void>;
}

const PLATFORMS = ['hinge', 'tinder', 'bumble', 'other'];

const AddEditMatchModal: React.FC<AddEditMatchModalProps> = ({
  visible,
  onDismiss,
  onAddMatch,
  isEditing = false,
  initialName = '',
  initialPlatform = '',
  onUpdateMatch,
}) => {
  const [name, setName] = useState(initialName);
  const [platform, setPlatform] = useState(initialPlatform);
  const [otherPlatform, setOtherPlatform] = useState(
    initialPlatform === 'other' ? initialPlatform : '',
  );
  const [platformError, setPlatformError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSnackbar, setShowSnackbar] = useState(false);
  const {height: windowHeight} = useWindowDimensions();
  const sheetMaxHeight = Math.min(Math.round(windowHeight * 0.88), 720);
  /** ModalSheet inner uses flex:1; without minHeight the sheet collapses (gradient is absolute). */
  const sheetMinHeight = Math.min(460, sheetMaxHeight);
  const nameFieldRef = useRef<React.ComponentRef<typeof TextInput> | null>(null);

  React.useEffect(() => {
    if (visible) {
      setName(initialName);
      setPlatform(initialPlatform);
      setOtherPlatform(initialPlatform === 'other' ? initialPlatform : '');
    }
  }, [visible, initialName, initialPlatform]);

  const handleAdd = async () => {
    if (!name.trim()) {
      return;
    }
    if (!platform) {
      setPlatformError('Please select a platform');
      return;
    }
    if (platform === 'other' && !otherPlatform.trim()) {
      setPlatformError('Please enter platform name');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing && onUpdateMatch) {
        await onUpdateMatch(
          name.trim(),
          platform === 'other' ? otherPlatform.trim() : platform,
        );
        setShowSnackbar(true);
        onDismiss();
      } else {
        await onAddMatch(
          name.trim(),
          platform === 'other' ? otherPlatform.trim() : platform,
        );
      }
      setName('');
      setPlatform('');
      setOtherPlatform('');
      setPlatformError('');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformSelect = (selectedPlatform: string) => {
    setPlatform(selectedPlatform);
    setPlatformError('');
  };

  const submitDisabled =
    !name.trim() ||
    isLoading ||
    (platform === 'other' && !otherPlatform.trim());

  return (
    <>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet
            padded
            fillHeight
            style={[
              styles.card,
              {maxHeight: sheetMaxHeight, minHeight: sheetMinHeight},
            ]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View>
                  <View style={styles.header}>
                    <AppText
                      testID="add-match-modal-title"
                      variant="titleSm"
                      color="hero"
                      style={styles.title}>
                      {isEditing ? 'Edit match' : 'Add a match'}
                    </AppText>
                    <ModalIconButton
                      icon="close"
                      size={40}
                      onPress={onDismiss}
                      testID="add-edit-match-close"
                      accessibilityLabel="Close"
                    />
                  </View>

                  <View style={styles.content}>
                    <View
                      testID="add-match-name-input"
                      accessibilityLabel="Match name field">
                      <TextInput
                        ref={(instance: React.ComponentRef<typeof TextInput> | null) => {
                          nameFieldRef.current = instance;
                        }}
                        label="Name"
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        mode="outlined"
                        outlineStyle={styles.inputOutline}
                        disabled={isLoading}
                      />
                    </View>

                    <AppText variant="label" color="heroMuted" style={styles.platformLabel}>
                      Platform
                    </AppText>
                    <View style={styles.platformButtons}>
                      {PLATFORMS.map(p => (
                        <CharmrButton
                          key={p}
                          label={p.charAt(0).toUpperCase() + p.slice(1)}
                          variant={platform === p ? 'primary' : 'outline'}
                          compact
                          onPress={() => handlePlatformSelect(p)}
                          style={styles.platformButton}
                          testID={`platform-${p}-button`}
                          accessibilityState={{selected: platform === p}}
                          disabled={isLoading}
                        />
                      ))}
                    </View>

                    {platform === 'other' && (
                      <TextInput
                        label="Enter Platform Name"
                        value={otherPlatform}
                        onChangeText={setOtherPlatform}
                        style={styles.input}
                        mode="outlined"
                        outlineStyle={styles.inputOutline}
                        disabled={isLoading}
                        testID="platform-other-field"
                      />
                    )}

                    {platformError ? (
                      <AppText variant="caption" color="danger" testID="platform-error">
                        {platformError}
                      </AppText>
                    ) : null}

                    <CharmrButton
                      label={isEditing ? 'Save changes' : 'Add match'}
                      variant="primary"
                      onPress={handleAdd}
                      disabled={submitDisabled}
                      loading={isLoading}
                      testID={isEditing ? 'update-match-button' : 'add-button'}
                      fullWidth
                    />
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </ScrollView>
          </ModalSheet>
        </ThemeProvider>
      </Modal>

      <Snackbar
        visible={showSnackbar}
        onDismiss={() => setShowSnackbar(false)}
        duration={2000}
        style={styles.snackbar}
        action={{
          label: 'OK',
          onPress: () => setShowSnackbar(false),
        }}>
        Match updated successfully!
      </Snackbar>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: tokens.space.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.space.lg,
  },
  title: {
    flex: 1,
  },
  content: {
    gap: tokens.space.md,
  },
  input: {
    backgroundColor: tokens.color.brand.primary,
    borderRadius: tokens.radii.paper,
  },
  inputOutline: {
    borderWidth: 1,
  },
  platformLabel: {
    marginBottom: tokens.space.xs,
  },
  platformButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
  },
  platformButton: {
    width: '48%',
    marginVertical: tokens.space.xxs,
  },
  snackbar: {
    backgroundColor: tokens.color.surface.muted,
  },
});

export default AddEditMatchModal;
