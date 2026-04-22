import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';

interface PhotoPermissionsModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const PhotoPermissionsModal: React.FC<PhotoPermissionsModalProps> = ({
  visible,
  onDismiss,
}) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={styles.card}>
            <AppText variant="titleSm" color="hero" style={styles.title}>
              Visual Guide
            </AppText>
            <View style={styles.gifContainer}>
              <Image
                source={require('../../assets/grant-photo-access.gif')}
                style={styles.gif}
                resizeMode="contain"
              />
            </View>
            <CharmrButton
              label="Close"
              variant="primary"
              onPress={onDismiss}
              fullWidth
            />
          </ModalSheet>
        </ThemeProvider>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
    gap: tokens.space.lg,
  },
  title: {
    textAlign: 'center',
  },
  gifContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gif: {
    width: '100%',
    height: 300,
    borderRadius: tokens.radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border.subtle,
  },
});

export default PhotoPermissionsModal;
