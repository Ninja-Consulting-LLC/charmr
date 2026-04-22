import React from 'react';
import {Modal, StyleSheet, View} from 'react-native';
import {ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalIconButton,
  ModalSheet,
  RNModalTransparentOverlay,
  rnModalOverlay,
  tokens,
} from '../design-system';

interface ArchiveMatchDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onArchive: () => void;
  matchName: string;
}

const ArchiveMatchDialog: React.FC<ArchiveMatchDialogProps> = ({
  visible,
  onDismiss,
  onArchive,
  matchName,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <RNModalTransparentOverlay>
        <ModalSheet padded={false} style={rnModalOverlay.sheet}>
          <ThemeProvider theme={darkModalPaperTheme}>
            <View style={styles.header}>
              <AppText variant="titleSm" color="hero">
                Archive match
              </AppText>
              <ModalIconButton
                icon="close"
                size={40}
                onPress={onDismiss}
                accessibilityLabel="Close"
              />
            </View>
            <View style={styles.content}>
              <AppText variant="body" color="heroMuted" style={styles.message}>
                Archive {matchName} for now? You can restore it later from
                Archived matches.
              </AppText>
              <View style={styles.actions}>
                <CharmrButton
                  testID="archive-match-cancel-button"
                  label="Cancel"
                  variant="outline"
                  compact
                  onPress={onDismiss}
                />
                <CharmrButton
                  testID="archive-match-confirm-button"
                  label="Archive"
                  variant="primary"
                  compact
                  onPress={onArchive}
                />
              </View>
            </View>
          </ThemeProvider>
        </ModalSheet>
      </RNModalTransparentOverlay>
    </Modal>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.color.border.subtle,
  },
  content: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
    gap: tokens.space.lg,
  },
  message: {
    lineHeight: tokens.type.body.lineHeight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    paddingHorizontal: tokens.space.lg,
    paddingBottom: tokens.space.lg,
  },
});

export default ArchiveMatchDialog;
