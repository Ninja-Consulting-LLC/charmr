import React, {useState} from 'react';
import {Platform, StyleSheet, useWindowDimensions, View} from 'react-native';
import {Modal, Portal, ThemeProvider} from 'react-native-paper';
import {
  AppText,
  CharmrButton,
  darkModalPaperTheme,
  ModalSheet,
  paperModalContent,
  tokens,
} from '../design-system';
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
  const {height: windowHeight} = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.88);

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
        theme={darkModalPaperTheme}
        onDismiss={onDismiss}
        contentContainerStyle={paperModalContent.shell}>
        <ThemeProvider theme={darkModalPaperTheme}>
          <ModalSheet padded style={[styles.card, {maxHeight: sheetMaxHeight}]}>
            <AppText variant="titleSm" color="hero" style={styles.title}>
              Allow photo access
            </AppText>
            <View style={styles.stepsContainer}>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepRow}>
                  <View style={styles.stepNumberWrap}>
                    <AppText variant="label" style={styles.stepNumber}>
                      {index + 1}
                    </AppText>
                  </View>
                  <AppText variant="body" color="heroMuted" style={styles.stepText}>
                    {step}
                  </AppText>
                </View>
              ))}
            </View>
            <View style={styles.buttonContainer}>
              <CharmrButton
                label="Got it"
                variant="primary"
                onPress={onDismiss}
                fullWidth
              />
              <CharmrButton
                label="See Visual Guide"
                variant="outline"
                onPress={() => setShowVisualGuide(true)}
                fullWidth
              />
            </View>
          </ModalSheet>
        </ThemeProvider>
      </Modal>

      <PhotoPermissionsModal
        visible={showVisualGuide}
        onDismiss={() => setShowVisualGuide(false)}
      />
    </Portal>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: tokens.space.md,
  },
  title: {
    textAlign: 'center',
  },
  stepsContainer: {
    gap: tokens.space.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.md,
  },
  stepNumberWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.color.accent.mintMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.color.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontWeight: '700',
    color: tokens.color.accent.mint,
    letterSpacing: 0,
  },
  stepText: {
    flex: 1,
  },
  buttonContainer: {
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
});

export default PermissionHelpModal;
