import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Text} from 'react-native-paper';
import {theme} from '../theme/theme';

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
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}>
        <Text variant="titleLarge" style={styles.title}>
          Visual Guide
        </Text>
        <View style={styles.gifContainer}>
          <Image
            source={require('../../assets/grant-photo-access.gif')}
            style={styles.gif}
            resizeMode="contain"
          />
        </View>
        <Button
          mode="contained"
          onPress={onDismiss}
          style={styles.button}
          textColor={theme.colors.surface}>
          Close
        </Button>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    margin: 20,
    borderRadius: 12,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
  gifContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gif: {
    width: '100%',
    height: 300,
  },
  button: {
    backgroundColor: theme.colors.secondary,
  },
});

export default PhotoPermissionsModal;
