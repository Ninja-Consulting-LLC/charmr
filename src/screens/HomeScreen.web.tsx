import React, {useMemo} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {useImagePicker} from '../hooks/useImagePicker';
import type {RootStackScreenProps} from '../navigation/types';

type HomeScreenProps = RootStackScreenProps<'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = ({navigation}) => {
  const {images, pickImages, setImages} = useImagePicker();

  const previewMatch = useMemo(
    () => ({
      id: 'web-preview',
      name: 'Preview Match',
      platform: 'web',
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Home (Web Preview)</Text>
        <Text style={styles.paragraph}>
          This browser target keeps navigation and core shell flow available.
          Native-only capabilities are replaced by safe fallbacks.
        </Text>
        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.primary]} onPress={pickImages}>
            <Text style={styles.primaryText}>Pick screenshot</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.secondary]}
            onPress={() => navigation.navigate('CoachChat', {match: previewMatch})}>
            <Text style={styles.secondaryText}>Open coach chat</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.ghost]}
            onPress={() => navigation.navigate('Login')}>
            <Text style={styles.ghostText}>Back to login</Text>
          </Pressable>
        </View>
        {images[0]?.path ? (
          <View style={styles.previewContainer}>
            <Image source={{uri: images[0].path}} style={styles.previewImage} />
            <Pressable style={styles.clearButton} onPress={() => setImages([])}>
              <Text style={styles.clearButtonText}>Remove selected screenshot</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.subtle}>No screenshot selected yet.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1f0835',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 560,
  },
  title: {
    color: '#7E22CE',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 12,
    color: '#555',
  },
  actions: {
    gap: 10,
    marginBottom: 12,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    backgroundColor: '#e6e0f3',
  },
  secondaryText: {
    color: '#3f2b5f',
    fontWeight: '600',
  },
  ghost: {
    borderWidth: 1,
    borderColor: '#cdbfe5',
  },
  ghostText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
  subtle: {
    color: '#666',
  },
  previewContainer: {
    marginTop: 8,
    gap: 8,
  },
  previewImage: {
    width: '100%',
    maxWidth: 420,
    height: 240,
    borderRadius: 12,
    backgroundColor: '#f2f2f2',
    objectFit: 'cover',
  },
  clearButton: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cdbfe5',
  },
  clearButtonText: {
    color: '#7E22CE',
    fontWeight: '600',
  },
});

export default HomeScreen;
