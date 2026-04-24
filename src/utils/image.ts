import { APP_CONFIG } from '../constants/config';

const PLACEHOLDER =
  'https://images.pexels.com/photos/1435904/pexels-photo-1435904.jpeg';

/**
 * The backend sometimes returns a bare S3 prefix as an "image" URL —
 * e.g. `https://rb-commerce-images.s3.ap-south-1.amazonaws.com/` —
 * which is a 200-but-empty response that FastImage renders blank.
 * A valid image URL must have a non-empty final path segment that
 * actually looks like a file (no trailing slash, not just a host).
 */
export function isValidImageUrl(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  const u = input.trim();
  if (!u) return false;
  // data: URIs are fine
  if (u.startsWith('data:')) return true;
  // trailing slash ⇒ no filename
  if (u.endsWith('/')) return false;
  // http(s) URL: strip host, ensure there's a non-empty path after it
  const m = u.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (m) {
    const path = m[1] ?? '';
    // must have at least one character after the host's / and not end in /
    if (!path || path === '/' || path.endsWith('/')) return false;
    // strip query/fragment then require a dot (extension) OR a real segment
    const bare = path.split(/[?#]/)[0];
    const lastSegment = bare.split('/').filter(Boolean).pop() ?? '';
    return lastSegment.length > 0;
  }
  // non-URL (relative path) — must not be just a slash
  return u !== '/';
}

/**
 * Percent-encode spaces and other URL-unsafe characters in a URL without
 * double-encoding already-escaped sequences. Backend images frequently
 * contain spaces (e.g. `.../jagerry bellam.jpg`) which break FastImage.
 */
function encodeUrl(raw: string): string {
  // If it already has percent-encoded chars, trust it — just replace spaces.
  if (/%[0-9A-Fa-f]{2}/.test(raw)) {
    return raw.replace(/ /g, '%20');
  }
  // Split scheme+host from path, only encode the path/query portion.
  try {
    const match = raw.match(/^(https?:\/\/[^/]+)(\/.*)?$/i);
    if (match) {
      const [, host, rest = ''] = match;
      return host + rest.replace(/ /g, '%20').replace(/#/g, '%23');
    }
  } catch {
    // fallthrough
  }
  return raw.replace(/ /g, '%20');
}

/**
 * Resolve a product / gallery image URL from mixed backend responses.
 * Backend sometimes returns absolute URLs, sometimes relative paths, and
 * URLs often contain spaces that must be percent-encoded.
 */
export function resolveImageUrl(
  input: string | undefined | null,
  fallback: string = PLACEHOLDER,
): string {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('data:')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return encodeUrl(trimmed);
  const base = APP_CONFIG.API_BASE_URL.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return encodeUrl(`${base}${path}`);
}

export function pickFirstImage(
  ...candidates: Array<string | undefined | null>
): string {
  for (const c of candidates) {
    if (isValidImageUrl(c)) return resolveImageUrl(c);
  }
  return PLACEHOLDER;
}

export { PLACEHOLDER as DEFAULT_IMAGE_PLACEHOLDER };

/**
 * Returns true if any of the candidate fields holds a non-empty image URL.
 * Used to filter lists so we only render products that have real images
 * coming from the backend (no placeholder stand-ins).
 */
export function hasRealImage(
  ...candidates: Array<string | undefined | null>
): boolean {
  for (const c of candidates) {
    if (isValidImageUrl(c)) return true;
  }
  return false;
}

/**
 * Convenience for filtering a list of products — keeps only those
 * whose first image resolves to a real backend URL (not the placeholder).
 */
export function hasProductImage(p: {
  image?: string | null;
  imageUrl?: string | null;
  images?: Array<string | null | undefined>;
  gallery?: Array<string | null | undefined>;
}): boolean {
  return hasRealImage(
    p.image,
    p.imageUrl,
    p.images?.[0],
    p.gallery?.[0],
  );
}
