import * as ExpoModulesCore from 'expo-modules-core';

const getFallbackUuid = () => {
  const random =
    (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function')
      ? (crypto as any).randomUUID()
      : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
  return random;
};

if (!(ExpoModulesCore as any).uuidv4) {
  (ExpoModulesCore as any).uuidv4 = getFallbackUuid;
}

