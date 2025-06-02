import React, {useState} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Button, Modal, Portal, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
import PhotoPermissionsModal from './PhotoPermissionsModal';

interface PermissionHelpModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const PermissionHelpModal: React.FC<PermissionHelpModalProps> = ({
  visible,
  onDismiss,
}) => {
  const [showVisualGuide, setShowVisualGuide] = useState(false);

  const iosSteps = [
    'Open your iPhone Settings',
    'Scroll down and tap on "Charmr"',
    'Tap on "Photos"',
    'Select "All Photos"',
    'Select "Allow Access"',
    'Return to the app',
  ];

  const androidSteps = [
    'Open your Android Settings',
    'Tap on "Apps"',
    'Find and tap on "Charmr"',
    'Tap on "Permissions"',
    'Tap on "Photos and videos"',
    'Select "Allow"',
    'Return to the app',
  ];

  const steps = Platform.OS === 'ios' ? iosSteps : androidSteps;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}>
        <Text variant="titleLarge" style={styles.title}>
          How to Grant Photo Access
        </Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={onDismiss}
            style={styles.button}
            textColor={theme.colors.surface}>
            Got it
          </Button>
          <Button
            mode="outlined"
            onPress={() => setShowVisualGuide(true)}
            style={styles.visualGuideButton}
            textColor={theme.colors.secondary}>
            See Visual Guide
          </Button>
        </View>
      </Modal>

      <PhotoPermissionsModal
        visible={showVisualGuide}
        onDismiss={() => setShowVisualGuide(false)}
      />
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
  stepsContainer: {
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
    color: theme.colors.surface,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    color: theme.colors.onSurface,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: theme.colors.secondary,
  },
  visualGuideButton: {
    borderColor: theme.colors.secondary,
  },
});

export default PermissionHelpModal;
