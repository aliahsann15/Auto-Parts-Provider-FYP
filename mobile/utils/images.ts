import { ImageSourcePropType } from 'react-native';
// require the image at runtime and type as any to avoid missing module declaration during type checking
const placeholderImage: any = require('@/assets/icons/placeholder.png');
import { API_BASE_URL } from '@/utils/api/client';

const apiBase = API_BASE_URL.replace(/\/api$/, '');
const apiBaseUrlInstance = (() => {
  try {
    return new URL(apiBase);
  } catch {
    return null;
  }
})();
const apiBaseHost = apiBaseUrlInstance?.host || '';
const apiBaseOrigin = apiBaseUrlInstance?.origin || apiBase;

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);
const IMAGE_PATH_PREFIXES = ['/images/', '/uploads/'];

const rewriteAbsoluteImageUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    const matchesHost = !apiBaseHost || parsed.host === apiBaseHost;
    if (!matchesHost) {
      return value;
    }
    for (const prefix of IMAGE_PATH_PREFIXES) {
      if (parsed.pathname.startsWith(prefix)) {
        return `${apiBaseOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }
  } catch {
    // ignore malformed URLs
  }
  return value;
};

export const PRODUCT_PLACEHOLDER: ImageSourcePropType = placeholderImage;

export const toAbsoluteImageUri = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (isAbsoluteUrl(path)) return rewriteAbsoluteImageUrl(path);
  return `${apiBase}${path.startsWith('/') ? path : `/${path}`}`;
};

export const resolveProductImageSource = (path?: string): ImageSourcePropType => {
  if (!path) return PRODUCT_PLACEHOLDER;
  return { uri: toAbsoluteImageUri(path) ?? path };
};
