import React, {useState} from 'react';
import {Image, Pressable, View} from 'react-native';
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

  return (
    <View style={styles.imageSection}>
      <View style={styles.imageGrid}>
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image
              source={{uri: image.path}}
              style={styles.image}
              resizeMode="cover"
              testID={`selected-image-${index}`}
            />
            <Pressable
              style={styles.removeImage}
              onPress={() => onRemoveImage(index)}
              testID={`remove-image-${index}`}>
              <Icon source="close" size={16} color="black" />
            </Pressable>
          </View>
        ))}
        <Pressable
          style={styles.addImageButton}
          onPress={handlePickImages}
          testID="image-picker-button">
          <Icon source="image-plus" size={24} color={theme.colors.secondary} />
          <Text style={styles.addImageText}>Add Screenshot (Optional)</Text>
        </Pressable>
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

const styles = {
  imageSection: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeImage: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.secondary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  addImageButton: {
    width: 120,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(64, 224, 208, 0.1)',
    gap: 8,
    position: 'relative',
  },
  addImageText: {
    fontSize: 14,
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

export default ImageSelector;
