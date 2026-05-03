/**
 * Google Places API (New) wrapper.
 *
 * The legacy Places API endpoints (`places/autocomplete/json`,
 * `places/details/json`) are no longer available on GCP projects
 * created from late 2025 onward — Google forces them onto the New API.
 * That's why this file uses `https://places.googleapis.com/v1/...`
 * exclusively.
 *
 * Differences from the legacy API:
 *   • POST instead of GET — body is JSON.
 *   • API key goes in the `X-Goog-Api-Key` header, NOT in the URL.
 *   • Place Details requires an `X-Goog-FieldMask` header to declare
 *     which fields you want (this is how Google bills you — only
 *     billed for fields you actually request).
 *   • Response shape is nested differently (`suggestions[].placePrediction.*`,
 *     `addressComponents[].longText/shortText/types`).
 *
 * Session token semantics are the same: mint one per typing session,
 * pass to BOTH autocomplete and details, mint a new one after the user
 * picks a suggestion. Saves money — bills the whole interaction as one.
 */

import Config from 'react-native-config';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL_PREFIX = 'https://places.googleapis.com/v1/places/';

// Field mask for Place Details — only ask for what we actually use.
// Each extra field potentially raises cost, so keep this tight.
const PLACE_DETAILS_FIELDS = [
  'id',
  'formattedAddress',
  'location',
  'addressComponents',
].join(',');

export interface PlaceSuggestion {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
}

export interface PlaceDetails {
  placeId: string;
  latitude: number;
  longitude: number;
  formatted: string;
  pincode?: string;
  city?: string;
  state?: string;
  country?: string;
  area?: string;
  road?: string;
}

export type AutocompleteResult =
  | { ok: true; suggestions: PlaceSuggestion[] }
  | { ok: false; error: 'key_missing' | 'key_rejected' | 'over_limit' | 'network' | 'timeout' | 'invalid_response'; message?: string };

export type PlaceDetailsResult =
  | { ok: true; details: PlaceDetails }
  | { ok: false; error: 'not_found' | 'key_missing' | 'key_rejected' | 'over_limit' | 'network' | 'timeout' | 'invalid_response'; message?: string };

function getApiKey(): string {
  return (Config.GOOGLE_MAPS_API_KEY as string | undefined) ?? '';
}

/**
 * RFC4122-ish UUID for the session token. Google treats this as opaque.
 */
export function createSessionToken(): string {
  const r = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  return `${r()}${r()}-${r()}-${r()}-${r()}-${r()}${r()}${r()}`;
}

async function timedFetch(
  url: string,
  init: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

interface NewSuggestion {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
  };
}

interface NewAutocompleteResponse {
  suggestions?: NewSuggestion[];
  error?: { code: number; message: string; status: string };
}

/**
 * Autocomplete via Places API (New). India-biased via `regionCode: "in"`.
 */
export async function autocomplete(
  input: string,
  sessionToken: string,
): Promise<AutocompleteResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[places] GOOGLE_MAPS_API_KEY is empty at runtime. Rebuild Android after editing .env.',
      );
    }
    return {
      ok: false,
      error: 'key_missing',
      message: 'GOOGLE_MAPS_API_KEY not bundled into APK — rebuild required.',
    };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: true, suggestions: [] };
  }

  let res: Response;
  try {
    res = await timedFetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
      },
      body: JSON.stringify({
        input: trimmed,
        sessionToken,
        regionCode: 'in',
        languageCode: 'en',
      }),
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e?.message };
  }

  let json: NewAutocompleteResponse;
  try {
    json = (await res.json()) as NewAutocompleteResponse;
  } catch {
    return { ok: false, error: 'invalid_response' };
  }

  if (!res.ok || json.error) {
    const status = json.error?.status ?? `HTTP ${res.status}`;
    const msg = json.error?.message ?? '';
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[places] Google rejected key: ${msg || status}`);
    }
    if (status === 'PERMISSION_DENIED' || res.status === 403) {
      return { ok: false, error: 'key_rejected', message: msg };
    }
    if (status === 'RESOURCE_EXHAUSTED' || res.status === 429) {
      return { ok: false, error: 'over_limit', message: msg };
    }
    return { ok: false, error: 'invalid_response', message: msg || status };
  }

  const suggestions: PlaceSuggestion[] = (json.suggestions ?? [])
    .map(s => s.placePrediction)
    .filter((p): p is NonNullable<NewSuggestion['placePrediction']> => !!p?.placeId)
    .map(p => ({
      placeId: p.placeId,
      primaryText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
      fullText: p.text?.text ?? '',
    }));
  return { ok: true, suggestions };
}

interface NewAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface NewPlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: NewAddressComponent[];
  error?: { code: number; message: string; status: string };
}

function pick(
  components: NewAddressComponent[] | undefined,
  ...types: string[]
): string | undefined {
  if (!components) return undefined;
  for (const t of types) {
    const found = components.find(c => c.types?.includes(t));
    if (found) return found.longText ?? found.shortText;
  }
  return undefined;
}

/**
 * Place Details via Places API (New). Pass the SAME sessionToken used for
 * autocomplete so Google bills the entire interaction as one session.
 */
export async function placeDetails(
  placeId: string,
  sessionToken: string,
): Promise<PlaceDetailsResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[places] GOOGLE_MAPS_API_KEY is empty at runtime. Rebuild Android after editing .env.',
      );
    }
    return {
      ok: false,
      error: 'key_missing',
      message: 'GOOGLE_MAPS_API_KEY not bundled into APK — rebuild required.',
    };
  }

  // Place Details (New) is GET. Session token + language go as query params.
  const url = `${DETAILS_URL_PREFIX}${encodeURIComponent(
    placeId,
  )}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=en`;

  let res: Response;
  try {
    res = await timedFetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACE_DETAILS_FIELDS,
      },
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') return { ok: false, error: 'timeout' };
    return { ok: false, error: 'network', message: e?.message };
  }

  let json: NewPlaceDetailsResponse;
  try {
    json = (await res.json()) as NewPlaceDetailsResponse;
  } catch {
    return { ok: false, error: 'invalid_response' };
  }

  if (!res.ok || json.error) {
    const status = json.error?.status ?? `HTTP ${res.status}`;
    const msg = json.error?.message ?? '';
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[places] details rejected: ${msg || status}`);
    }
    if (status === 'NOT_FOUND' || res.status === 404) {
      return { ok: false, error: 'not_found' };
    }
    if (status === 'PERMISSION_DENIED' || res.status === 403) {
      return { ok: false, error: 'key_rejected', message: msg };
    }
    if (status === 'RESOURCE_EXHAUSTED' || res.status === 429) {
      return { ok: false, error: 'over_limit', message: msg };
    }
    return { ok: false, error: 'invalid_response', message: msg || status };
  }

  if (!json.location) {
    return { ok: false, error: 'not_found' };
  }
  const c = json.addressComponents;
  const details: PlaceDetails = {
    placeId: json.id ?? placeId,
    latitude: json.location.latitude,
    longitude: json.location.longitude,
    formatted: json.formattedAddress ?? '',
    pincode: pick(c, 'postal_code'),
    city: pick(
      c,
      'locality',
      'postal_town',
      'administrative_area_level_2',
      'sublocality_level_1',
    ),
    state: pick(c, 'administrative_area_level_1'),
    country: pick(c, 'country'),
    area: pick(
      c,
      'sublocality_level_2',
      'sublocality_level_1',
      'sublocality',
      'neighborhood',
    ),
    road: pick(c, 'route'),
  };
  return { ok: true, details };
}
