import React, {useState} from 'react';
import {Image, Pressable, View, useWindowDimensions} from 'react-native';
import {Button, Icon, Text} from 'react-native-paper';
import {useImagePicker} from '../hooks/useImagePicker';
import {theme} from '../theme/theme';
import {SubscriptionTier} from '../types/enums';
import {SelectedImage} from '../types/types';

interface ImageSelectorProps {
  images: SelectedImage[];
  onRemoveImage: (index: number) => void;
  onPickImages: () => void;
  userPlan?: SubscriptionTier;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  onRemoveImage,
  onPickImages,
  userPlan,
}) => {
  const [showPermissionError, setShowPermissionError] = useState(false);
  const {openSettings} = useImagePicker();
  const {height: windowHeight, width: windowWidth} = useWindowDimensions();

  const handlePickImages = async () => {
    try {
      setShowPermissionError(false);
      await onPickImages();
    } catch (error) {
      if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
        setShowPermissionError(true);
      }
    }
  };

  const styles = {
    imageSection: {
      paddingVertical: 12,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageBorderWrapper: {
      backgroundColor: theme.colors.secondary,
      padding: 6,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: windowWidth * 0.75,
      height: windowWidth * 0.75 * (16 / 9),
      borderRadius: 20,
      objectFit: 'cover',
    },
    removeImage: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: theme.colors.secondary,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.secondary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    addImageButton: {
      width: windowWidth * 0.75,
      height: windowWidth * 0.75 * (16 / 9),
      borderRadius: 24,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(64, 224, 208, 0.1)',
      gap: 16,
      position: 'relative',
      shadowColor: theme.colors.secondary,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    addImageText: {
      fontSize: 22,
      textAlign: 'center',
      color: theme.colors.secondary,
    },
    permissionError: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.colors.errorContainer,
      borderRadius: 8,
      alignItems: 'center',
    },
    permissionErrorText: {
      color: theme.colors.error,
      marginBottom: 8,
      textAlign: 'center',
    },
    settingsButton: {
      backgroundColor: theme.colors.error,
    },
  } as const;

  return (
    <View style={styles.imageSection}>
      <View style={styles.imageGrid}>
        {images.length > 0 ? (
          <View style={styles.imageBorderWrapper}>
            <Image
              source={{uri: images[0].path}}
              style={styles.image}
              resizeMode="cover"
              testID="selected-image-0"
            />
            <Pressable
              style={styles.removeImage}
              onPress={() => onRemoveImage(0)}
              testID="remove-image-0">
              <Icon source="close" size={16} color="black" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={styles.addImageButton}
            onPress={handlePickImages}
            testID="image-picker-button">
            <Icon
              source="image-plus"
              size={32}
              color={theme.colors.secondary}
            />
            <Text style={styles.addImageText}>Add Screenshot</Text>
          </Pressable>
        )}
      </View>
      {showPermissionError && (
        <View style={styles.permissionError}>
          <Text style={styles.permissionErrorText}>
            Please grant photo access to add screenshots
          </Text>
          <Button
            mode="contained"
            onPress={openSettings}
            style={styles.settingsButton}>
            Open Settings
          </Button>
        </View>
      )}
    </View>
  );
};

export default ImageSelector;
