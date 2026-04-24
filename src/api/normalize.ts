import { isValidImageUrl } from '../utils/image';
import type {
  Category,
  GalleryImage,
  Product,
  ProductQtyOption,
  ProductReview,
} from '../types';

/**
 * Maps backend Product DTO to the UI Product type.
 * Backend uses mixed casing and some typos (e.g. `newArraival`); we
 * normalize everything here so the rest of the app stays clean.
 */
export function normalizeProduct(raw: any): Product {
  if (!raw || typeof raw !== 'object') return raw;

  // Backend sends bare S3 prefixes (e.g. ".../amazonaws.com/") as
  // placeholder image URLs on many products — we must skip those or
  // every product ends up showing the same 404 fallback.
  // `thumbNail` is typically the real file, so list it first; we also
  // dedupe to avoid rendering the same URL multiple times.
  const images = [
    raw.thumbNail,
    raw.smallImage,
    raw.hoverImage,
    raw.swatchImage,
    raw.image,
    raw.imageUrl,
  ]
    .filter(isValidImageUrl)
    .filter((u, i, arr) => arr.indexOf(u) === i) as string[];

  const qtyOptionsRaw: any[] = Array.isArray(raw.productQtyOptions)
    ? raw.productQtyOptions
    : Array.isArray(raw.qtyOptions)
    ? raw.qtyOptions
    : [];

  const qtyOptions: ProductQtyOption[] = qtyOptionsRaw
    .map(o => {
      const price =
        typeof o.specialPrice === 'number' && o.specialPrice > 0
          ? o.specialPrice
          : typeof o.price === 'number'
          ? o.price
          : undefined;
      const mrp =
        typeof o.msrp === 'number' && o.msrp > 0
          ? o.msrp
          : typeof o.mrp === 'number' && o.mrp > 0
          ? o.mrp
          : undefined;
      return {
        id: o.productQtyOptionId ?? o.qtyOptionId ?? o.id,
        qtyOptionId: o.productQtyOptionId ?? o.qtyOptionId ?? o.id,
        label: o.label ?? o.name ?? o.type ?? o.title ?? '',
        name: o.name ?? o.label ?? o.type,
        value: o.value,
        price,
        mrp,
        stock: o.stock ?? o.quantity,
        startQty: o.startQty,
        endQty: o.endQty,
        displayOrder:
          typeof o.displayOrder === 'number' ? o.displayOrder : undefined,
        default: !!o.default,
      };
    })
    // Sort by displayOrder when available so the "first" option is the smallest/default.
    .sort((a, b) => {
      const ao = a.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.displayOrder ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });

  // Product-level price can be 0 when pricing lives only in qty options.
  // Fall back to the first qty option's price/mrp for list-card display.
  const firstOption = qtyOptions[0];
  const specialPrice =
    typeof raw.specialPrice === 'number' && raw.specialPrice > 0
      ? raw.specialPrice
      : undefined;
  const rawPrice = typeof raw.price === 'number' ? raw.price : 0;
  const displayPrice =
    specialPrice && specialPrice > 0
      ? specialPrice
      : rawPrice > 0
      ? rawPrice
      : firstOption?.price ?? 0;

  const rawMsrp =
    typeof raw.msrp === 'number' && raw.msrp > 0
      ? raw.msrp
      : typeof raw.mrp === 'number' && raw.mrp > 0
      ? raw.mrp
      : undefined;
  const displayMrp =
    rawMsrp !== undefined
      ? rawMsrp
      : firstOption?.mrp && firstOption.mrp > displayPrice
      ? firstOption.mrp
      : undefined;

  const discountPercent =
    displayMrp && displayMrp > displayPrice
      ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
      : undefined;

  const unit =
    firstOption?.name ?? firstOption?.label ?? raw.unit ?? undefined;

  const reviewsRaw: any[] = Array.isArray(raw.reviews) ? raw.reviews : [];
  const reviews: ProductReview[] = reviewsRaw.map(r => ({
    id: r.id ?? r.reviewId,
    reviewId: r.reviewId ?? r.id,
    customerId: r.customerId,
    customerName: r.customerName ?? r.reviewerName,
    rating: r.rating ?? r.stars ?? 0,
    title: r.title ?? r.reviewTitle,
    comment: r.comment ?? r.message,
    message: r.message ?? r.comment,
    createdAt: r.createdAt,
  }));

  return {
    id: raw.id ?? raw.productId,
    productId: raw.productId ?? raw.id,
    name: raw.name ?? '',
    sku: raw.sku,
    description: raw.description,
    shortDescription: raw.short_description ?? raw.shortDescription,
    price: displayPrice,
    mrp: displayMrp,
    discountPercent,
    unit,
    cost: raw.cost,
    quantity: raw.quantity,
    stock: raw.stock ?? raw.quantity,
    inStock:
      raw.outOfStock === 1 || raw.outOfStock === true
        ? false
        : raw.inStock !== undefined
        ? !!raw.inStock
        : true,
    image: images[0],
    imageUrl: images[0],
    images,
    gallery: Array.isArray(raw.gallery)
      ? (raw.gallery as unknown[]).filter(isValidImageUrl)
      : images,
    categoryId: raw.categoryId,
    category: raw.categoryName ?? raw.category,
    isActive: raw.isActive,
    isFeatured: !!(raw.isFeatured ?? raw.smFeatured),
    isBestSeller: !!(raw.isBestSeller ?? raw.bestSeller),
    // backend typo: 'newArraival'
    isNewArrival: !!(raw.isNewArrival ?? raw.newArrival ?? raw.newArraival),
    qtyOptions,
    reviews,
    rating: raw.rating ?? raw.averageRating ?? 0,
    totalReviews: raw.totalReviews ?? raw.totalRatings ?? reviews.length,
    relatedProducts: Array.isArray(raw.relatedProducts)
      ? raw.relatedProducts.map(normalizeProduct)
      : undefined,
  };
}

export function normalizeProducts(arr: any): Product[] {
  return (Array.isArray(arr) ? arr : []).map(normalizeProduct);
}

export function normalizeCategory(raw: any): Category {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    id: raw.id ?? raw.categoryId,
    categoryId: raw.categoryId ?? raw.id,
    name: raw.name ?? '',
    parentId: raw.parentId ?? raw.parentCategoryId,
    image: raw.image,
    icon: raw.icon,
    isActive: raw.isActive,
    children: Array.isArray(raw.children)
      ? raw.children.map(normalizeCategory)
      : Array.isArray(raw.subcategories)
      ? raw.subcategories.map(normalizeCategory)
      : undefined,
    subcategories: Array.isArray(raw.subcategories)
      ? raw.subcategories.map(normalizeCategory)
      : undefined,
  };
}

export function normalizeCategories(arr: any): Category[] {
  return (Array.isArray(arr) ? arr : []).map(normalizeCategory);
}

export function normalizeGalleryImage(raw: any): GalleryImage {
  if (!raw || typeof raw !== 'object') return raw;
  return {
    id: raw.id,
    image: raw.image ?? raw.imageUrl ?? raw.url,
    imageUrl: raw.imageUrl ?? raw.image ?? raw.url,
    url: raw.url ?? raw.image,
    title: raw.title ?? raw.heading,
    orientation: raw.orientation,
    position: raw.position,
    linkTo: raw.linkTo,
  };
}

export function normalizeGalleryImages(arr: any): GalleryImage[] {
  return (Array.isArray(arr) ? arr : []).map(normalizeGalleryImage);
}
