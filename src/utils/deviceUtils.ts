import DeviceInfo from 'react-native-device-info';

export const getDeviceId = async (): Promise<string> => {
  try {
    // Try to get MAC address first
    const macAddress = await DeviceInfo.getMacAddress();
    if (macAddress && macAddress !== '02:00:00:00:00:00') {
      return macAddress;
    }

    // Fallback to unique device ID if MAC address is not available
    const uniqueId = await DeviceInfo.getUniqueId();
    return uniqueId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Generate a random ID as last resort
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};
