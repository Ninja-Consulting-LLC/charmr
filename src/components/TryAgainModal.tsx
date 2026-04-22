import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Modal, Portal} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';

interface TryAgainModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const TryAgainModal: React.FC<TryAgainModalProps> = ({visible, onDismiss}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ModalSheet padded style={styles.card}>
          <AppText variant="titleSm" color="hero" style={styles.title}>
            That took too long
          </AppText>
          <AppText variant="body" color="heroMuted" style={styles.message}>
            Your connection or our servers may be slow. Tap Generate reply to
            try again.
          </AppText>
          <CharmrButton
            label="Close"
            variant="primary"
            onPress={onDismiss}
            testID="try-again-close-button"
            fullWidth
          />
        </ModalSheet>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: tokens.space.md,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
});

export default TryAgainModal;
