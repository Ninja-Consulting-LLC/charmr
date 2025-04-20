import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {View} from 'react-native';
import {IconButton, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import DevMenu from '../components/DevMenu';
import ResponseGenerator from '../components/ResponseGenerator';
import {RootStackParamList} from '../navigation/types';
import {useStore} from '../store';

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<HomeScreenProps> = () => {
  const {setShowDevMenu} = useStore();

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={{flex: 1}}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
          }}>
          <Text variant="headlineSmall">Dating Buddy</Text>
          {__DEV__ && (
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowDevMenu(true)}
            />
          )}
        </View>
        <ResponseGenerator />
        <DevMenu />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
