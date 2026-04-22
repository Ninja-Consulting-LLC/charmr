import {StyleSheet} from 'react-native';
import {tokens} from './tokens';

/** Paper `Modal` `contentContainerStyle`: transparent shell; put `ModalSheet` inside. */
export const paperModalContent = StyleSheet.create({
  shell: {
    marginVertical: tokens.space['2xl'],
    alignSelf: 'center',
    width: '86%',
    maxWidth: 400,
    backgroundColor: 'transparent',
  },
});

/** Full-screen overlay for RN `Modal` `transparent` + centered sheet. */
export const rnModalOverlay = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tokens.color.overlay.modalBackdrop,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.space.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
});
