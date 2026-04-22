import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Banner, Icon} from 'react-native-paper';
import {AppText, tokens} from '../design-system';
import PermissionHelpModal from './PermissionHelpModal';

interface PhotoAccessBannerProps {
  visible: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
  topOffset?: number;
}

const PhotoAccessBanner: React.FC<PhotoAccessBannerProps> = ({
  visible,
  onDismiss,
  onOpenSettings,
  topOffset = 0,
}) => {
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);

  return (
    <>
      <View style={[styles.bannerContainer, {top: topOffset}]}>
        <Banner
          visible={visible}
          icon={({size, color}) => (
            <Icon source="camera" size={size} color={tokens.color.brand.primary} />
          )}
          contentStyle={{paddingVertical: 2, marginBottom: -8}}
          style={{
            backgroundColor: tokens.color.surface.inverse,
            minHeight: 30,
          }}
          actions={[
            {
              label: 'Settings',
              onPress: onOpenSettings,
              textColor: tokens.color.brand.primary,
            },
            {
              label: 'Help',
              onPress: () => setShowPermissionHelp(true),
              textColor: tokens.color.brand.primary,
            },
            {
              label: 'Dismiss',
              onPress: onDismiss,
              textColor: tokens.color.brand.primary,
            },
          ]}>
          <AppText variant="body" style={{color: tokens.color.brand.primary}}>
            Allow photos so you can pick chat screenshots from your library
          </AppText>
        </Banner>
      </View>

      <PermissionHelpModal
        visible={showPermissionHelp}
        onDismiss={() => setShowPermissionHelp(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});

export default PhotoAccessBanner;
