import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Banner, Icon, Text} from 'react-native-paper';
import {theme} from '../theme/theme';
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
            <Icon source="camera" size={size} color={theme.colors.primary} />
          )}
          contentStyle={{paddingVertical: 2, marginBottom: -8}}
          style={{
            backgroundColor: theme.colors.surface,
            minHeight: 30,
          }}
          actions={[
            {
              label: 'Settings',
              onPress: onOpenSettings,
              textColor: theme.colors.primary,
            },
            {
              label: 'Help',
              onPress: () => setShowPermissionHelp(true),
              textColor: theme.colors.primary,
            },
            {
              label: 'Dismiss',
              onPress: onDismiss,
              textColor: theme.colors.primary,
            },
          ]}>
          <Text style={{color: theme.colors.primary}}>
            Grant photo access to get the best experience in Charmr
          </Text>
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
