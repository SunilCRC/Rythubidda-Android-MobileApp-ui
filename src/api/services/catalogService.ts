import { apiGet } from '../client';
import { ENDPOINTS } from '../../constants/endpoints';
import { toArray } from '../../utils/format';
import {
  normalizeCategories,
  normalizeGalleryImages,
  normalizeProduct,
  normalizeProducts,
} from '../normalize';
import type {
  Banner,
  Category,
  GalleryImage,
  PincodeValidation,
  Product,
} from '../../types';

export const catalogService = {
  getCategories: async (): Promise<Category[]> => {
    const raw = await apiGet<any>(ENDPOINTS.CATEGORIES);
    return normalizeCategories(toArray(raw));
  },

  getFeaturedProducts: async (): Promise<Product[]> => {
    const raw = await apiGet<any>(ENDPOINTS.FEATURED_PRODUCTS);
    return normalizeProducts(toArray(raw));
  },

  getProductsByCategory: async (
    categoryId: number | string,
    page = 0,
    size = 20,
  ): Promise<Product[]> => {
    const raw = await apiGet<any>(ENDPOINTS.PRODUCTS_BY_CATEGORY(categoryId), {
      params: { page, size },
    });
    return normalizeProducts(toArray(raw));
  },

  getProduct: async (productId: number | string): Promise<Product> => {
    const raw = await apiGet<any>(ENDPOINTS.PRODUCT_DETAIL(productId));
    // Endpoint returns `{product: {...}}` (post-unwrap) or `{...}` directly.
    const inner =
      raw && typeof raw === 'object' && 'product' in raw ? raw.product : raw;
    return normalizeProduct(inner);
  },

  search: async (name: string): Promise<Product[]> => {
    const raw = await apiGet<any>(ENDPOINTS.SEARCH, { params: { name } });
    return normalizeProducts(toArray(raw));
  },

  searchSuggestions: (query: string) =>
    apiGet<Array<{ id: number; name: string; image?: string }>>(
      ENDPOINTS.SEARCH_SUGGESTIONS,
      { params: { query } },
    ),

  getGallery: async (): Promise<GalleryImage[]> => {
    const raw = await apiGet<any>(ENDPOINTS.GALLERY_MAIN);
    return normalizeGalleryImages(toArray(raw));
  },

  getActiveBanners: () => apiGet<Banner[]>(ENDPOINTS.BANNERS_ACTIVE),

  validatePincode: async (pincode: string): Promise<PincodeValidation> => {
    const raw = await apiGet<any>(ENDPOINTS.PINCODE_VALIDATE, {
      params: { pincode },
    });
    // Backend might return `{isDeliverable: bool}` or `{available: bool}`
    if (raw && typeof raw === 'object') {
      if ('isDeliverable' in raw) return raw as PincodeValidation;
      if ('available' in raw)
        return { isDeliverable: !!raw.available, zipCode: raw.pincode };
      if ('deliverable' in raw)
        return { isDeliverable: !!raw.deliverable, zipCode: raw.pincode };
    }
    return { isDeliverable: false };
  },
};
