import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {Icon} from 'react-native-paper';
import {AppText} from '../design-system';
import {getScreenshotTileDimensions} from '../design-system/screenshotTile';
import {tokens} from '../design-system/tokens';
import {SubscriptionTier} from '../types/enums';
import {SelectedImage} from '../types/types';

interface ImageSelectorProps {
  images: SelectedImage[];
  onRemoveImage: (index: number) => void;
  onPickImages: () => void;
  userPlan?: SubscriptionTier;
  onPermissionError?: () => void;
}

const ImageSelector: React.FC<ImageSelectorProps> = ({
  images,
  onRemoveImage,
  onPickImages,
  userPlan: _userPlan,
  onPermissionError,
}) => {
  const {height: windowHeight} = useWindowDimensions();
  const {tileWidth, tileHeight} = getScreenshotTileDimensions(windowHeight);

  const handlePickImages = async () => {
    try {
      await onPickImages();
    } catch (error) {
      if (error instanceof Error && error.message === 'PERMISSION_DENIED') {
        onPermissionError?.();
      }
    }
  };

  return (
    <View style={styles.imageSection}>
      <View style={styles.imageGrid}>
        {images.length > 0 ? (
          <View>
            <Image
              source={{uri: images[0].path}}
              style={[
                styles.image,
                {width: tileWidth, height: tileHeight},
              ]}
              resizeMode="contain"
              testID="selected-image-0"
            />
            <Pressable
              style={styles.removeImage}
              onPress={() => onRemoveImage(0)}
              testID="remove-image-0"
              accessibilityRole="button"
              accessibilityLabel="Remove screenshot">
              <Icon
                source="close"
                size={22}
                color={tokens.color.text.onInverse}
              />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[
              styles.addImageButton,
              {width: tileWidth, height: tileHeight},
            ]}
            onPress={handlePickImages}
            testID="image-picker-button">
            <Icon
              source="image-plus"
              size={32}
              color={tokens.color.accent.mint}
            />
            <View style={styles.addImageLabels}>
              <AppText variant="titleSm" color="hero" style={styles.addImageText}>
                Add a screenshot
              </AppText>
              <AppText variant="caption" style={styles.addImageSubtext}>
                From a chat or profile
              </AppText>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  imageSection: {
    paddingVertical: tokens.space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(14, 9, 24, 0.35)',
    ...tokens.elevation.sm,
  },
  removeImage: {
    position: 'absolute',
    top: tokens.space.md,
    right: tokens.space.md,
    backgroundColor: tokens.color.surface.inverse,
    borderWidth: 2,
    borderColor: 'rgba(26, 21, 35, 0.35)',
    borderRadius: tokens.radii.xl,
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    ...tokens.elevation.md,
  },
  addImageButton: {
    borderRadius: tokens.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    gap: tokens.space.sm,
    ...tokens.elevation.sm,
  },
  addImageLabels: {
    alignItems: 'center',
    gap: tokens.space.xxs,
  },
  addImageText: {
    textAlign: 'center',
  },
  addImageSubtext: {
    textAlign: 'center',
    color: tokens.color.hero.textSubtle,
  },
});

export default ImageSelector;
