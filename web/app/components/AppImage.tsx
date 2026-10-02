import NextImage, { type ImageProps } from 'next/image'

function normalizeImageSrc(src: string): string {
  if (!src) return src

  const normalizePath = (pathname: string, search = '') => {
    if (pathname.startsWith('uploads/')) pathname = `/${pathname}`
    if (pathname.startsWith('images/')) pathname = `/${pathname}`
    if (pathname.startsWith('/uploads/') || pathname.startsWith('/images/')) {
      return `${pathname}${search}`
    }
    return src
  }

  // Absolute URL (possibly with an outdated host) → keep only the path for known public asset roots.
  try {
    const url = new URL(src)
    return normalizePath(url.pathname, url.search)
  } catch {
    // Not a URL
  }

  // Already a root-relative path or a bare uploads/images path.
  if (src.startsWith('/uploads/') || src.startsWith('/images/')) return src
  if (src.startsWith('uploads/') || src.startsWith('images/')) return `/${src}`

  return src
}

export default function Image(props: ImageProps) {
  const normalizedSrc =
    typeof props.src === 'string' ? normalizeImageSrc(props.src) : props.src
  return <NextImage {...props} src={normalizedSrc} />
}

