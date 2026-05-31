import { Platform } from 'react-native';
import * as localDB from './localDatabase';

export interface DeviceIdentity {
  deviceId: string;
  deviceName: string;
}

const LOCAL_DEVICE_ID_KEY = 'local_device_id';

const makeDeviceId = () => {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `acecbt-${Date.now()}-${randomPart}`;
};

const getPlatformDeviceName = () => {
  const platformLabel = Platform.OS === 'ios' ? 'iPhone' : Platform.OS === 'android' ? 'Android Device' : 'This Device';
  const constants = Platform.constants as Record<string, any> | undefined;
  const candidates = [
    constants?.Model,
    constants?.model,
    constants?.Brand && constants?.Model ? `${constants.Brand} ${constants.Model}` : null,
    constants?.Fingerprint,
  ];

  const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return match ? String(match).trim() : platformLabel;
};

export const getDeviceIdentity = async (): Promise<DeviceIdentity> => {
  let deviceId = await localDB.getSetting(LOCAL_DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = makeDeviceId();
    await localDB.saveSetting(LOCAL_DEVICE_ID_KEY, deviceId);
  }

  return {
    deviceId,
    deviceName: getPlatformDeviceName(),
  };
};
