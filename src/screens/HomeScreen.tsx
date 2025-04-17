import React, {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {FAB, Text, useTheme} from 'react-native-paper';
import DevMenu from '../components/DevMenu';
import KeyboardModal from '../components/KeyboardModal';

const HomeScreen = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const theme = useTheme();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Text variant="headlineMedium" style={{color: theme.colors.onBackground}}>
        You're in!
      </Text>
      <DevMenu />
      <KeyboardModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
      />
      <FAB
        icon="keyboard"
        style={[styles.fab, {backgroundColor: theme.colors.primary}]}
        onPress={() => setModalVisible(true)}
        label="Magic Keyboard"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    top: 0,
  },
});

export default HomeScreen;
