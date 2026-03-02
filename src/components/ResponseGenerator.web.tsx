import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {forwardRef, useImperativeHandle} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useImagePicker} from '../hooks/useImagePicker';
import {RootStackParamList} from '../navigation/types';

export interface ResponseGeneratorRef {
  loadMatches: () => Promise<void>;
}

type ResponseGeneratorProps = {
  navigation: NativeStackScreenProps<RootStackParamList, 'Home'>['navigation'];
};

const ResponseGenerator = forwardRef<
  ResponseGeneratorRef,
  ResponseGeneratorProps
>(({navigation}, ref) => {
  const {images, pickImages, setImages} = useImagePicker();

  useImperativeHandle(ref, () => ({
    loadMatches: async () => undefined,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Web Preview</Text>
      <Text style={styles.text}>
        Response generation and camera-roll workflows are reduced in browser
        mode. Navigation and shell remain active.
      </Text>
      <Pressable style={[styles.button, styles.primary]} onPress={pickImages}>
        <Text style={styles.primaryText}>
          {images.length > 0 ? 'Replace screenshot' : 'Select screenshot'}
        </Text>
      </Pressable>
      {images.length > 0 ? (
        <Pressable
          style={[styles.button, styles.secondary]}
          onPress={() => setImages([])}>
          <Text style={styles.secondaryText}>Clear screenshot</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={[styles.button, styles.ghost]}
        onPress={() =>
          navigation.navigate('CoachChat', {
            match: {
              id: 'web-preview',
              userId: 'web-preview',
              name: 'Preview Match',
              platform: 'web',
              lastUsed: new Date().toISOString(),
              hidden: false,
              deleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          })
        }>
        <Text style={styles.ghostText}>Open coach chat preview</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  text: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 460,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 260,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#40E0D0',
  },
  primaryText: {
    color: '#111',
    fontWeight: '600',
  },
  secondary: {
    backgroundColor: '#ece9f5',
  },
  secondaryText: {
    color: '#3f2b5f',
    fontWeight: '600',
  },
  ghost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  ghostText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default ResponseGenerator;
