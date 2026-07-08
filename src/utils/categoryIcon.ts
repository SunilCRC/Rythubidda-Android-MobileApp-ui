/**
 * Category → emoji lookup.
 *
 * Why this exists: the backend's category list is human-edited and
 * inconsistently cased ("Kismis" vs "kismiss" vs "Palm oil" vs
 * "brown Rice"), with no `iconKey` column. The mobile app used to
 * cycle through a fixed `['shopping-bag', 'coffee', 'droplet', …]`
 * Feather array which produced confidently WRONG icons (a coffee cup
 * for Cashew, a droplet for Chilli). This util replaces that with a
 * keyword-based lookup that picks an emoji whose meaning matches
 * the category name.
 *
 * Two helpers exported:
 *   • iconForCategory(name) — returns a single emoji string, never
 *     empty. Falls back to a neutral "🛒" if nothing matches.
 *   • titleCaseCategory(name) — normalises casing so "palm oil" and
 *     "PALM OIL" both render as "Palm Oil" in the UI. Doesn't touch
 *     the DB row.
 *
 * Lookup is keyword-substring, longest-first, case-insensitive.
 * "Brown Rice" matches "rice"; "Palm Oil" matches "palm oil" before
 * the shorter "oil" generic rule kicks in.
 */

interface IconRule {
  /** Lowercase keyword(s) to match against the category name. */
  keyword: string;
  emoji: string;
}

// Longest keywords FIRST so "palm oil" wins over "oil", "sunflower oil"
// wins over "oil", "ghee" wins over "butter", etc. The first matching
// rule wins.
const RULES: IconRule[] = [
  // Oils — specific first
  { keyword: 'palm oil', emoji: '🫒' },
  { keyword: 'olive oil', emoji: '🫒' },
  { keyword: 'sunflower oil', emoji: '🌻' },
  { keyword: 'coconut oil', emoji: '🥥' },
  { keyword: 'mustard oil', emoji: '🌼' },
  { keyword: 'sesame oil', emoji: '🌱' },
  { keyword: 'groundnut oil', emoji: '🥜' },
  { keyword: 'peanut oil', emoji: '🥜' },
  { keyword: 'oil', emoji: '🫗' },

  // Nuts & dry fruits — specific first
  { keyword: 'cashew', emoji: '🥜' },
  { keyword: 'kaju', emoji: '🥜' },
  { keyword: 'almond', emoji: '🌰' },
  { keyword: 'badam', emoji: '🌰' },
  { keyword: 'pistachio', emoji: '🥜' },
  { keyword: 'pista', emoji: '🥜' },
  { keyword: 'walnut', emoji: '🌰' },
  { keyword: 'akhrot', emoji: '🌰' },
  { keyword: 'raisin', emoji: '🍇' },
  { keyword: 'kismis', emoji: '🍇' },
  { keyword: 'kismiss', emoji: '🍇' },
  { keyword: 'kishmish', emoji: '🍇' },
  { keyword: 'date', emoji: '🌴' },
  { keyword: 'khajoor', emoji: '🌴' },
  { keyword: 'fig', emoji: '🌳' },
  { keyword: 'anjeer', emoji: '🌳' },
  { keyword: 'apricot', emoji: '🍑' },
  { keyword: 'dry fruit', emoji: '🥜' },
  { keyword: 'dryfruit', emoji: '🥜' },
  { keyword: 'nut', emoji: '🥜' },

  // Rice & grains
  { keyword: 'brown rice', emoji: '🍚' },
  { keyword: 'basmati', emoji: '🍚' },
  { keyword: 'sona masuri', emoji: '🍚' },
  { keyword: 'rice', emoji: '🍚' },
  { keyword: 'biriyani', emoji: '🍛' },
  { keyword: 'biryani', emoji: '🍛' },
  { keyword: 'wheat', emoji: '🌾' },
  { keyword: 'atta', emoji: '🌾' },
  { keyword: 'flour', emoji: '🌾' },
  { keyword: 'millet', emoji: '🌾' },
  { keyword: 'jowar', emoji: '🌾' },
  { keyword: 'bajra', emoji: '🌾' },
  { keyword: 'ragi', emoji: '🌾' },

  // Pulses & legumes
  { keyword: 'dal', emoji: '🫘' },
  { keyword: 'dhal', emoji: '🫘' },
  { keyword: 'lentil', emoji: '🫘' },
  { keyword: 'chana', emoji: '🫘' },
  { keyword: 'chickpea', emoji: '🫘' },
  { keyword: 'rajma', emoji: '🫘' },
  { keyword: 'pulse', emoji: '🫘' },
  { keyword: 'bean', emoji: '🫘' },

  // Spices
  { keyword: 'chilli', emoji: '🌶' },
  { keyword: 'chili', emoji: '🌶' },
  { keyword: 'mirchi', emoji: '🌶' },
  { keyword: 'turmeric', emoji: '🌼' },
  { keyword: 'haldi', emoji: '🌼' },
  { keyword: 'pepper', emoji: '🌶' },
  { keyword: 'cumin', emoji: '🌿' },
  { keyword: 'jeera', emoji: '🌿' },
  { keyword: 'coriander', emoji: '🌿' },
  { keyword: 'dhania', emoji: '🌿' },
  { keyword: 'cardamom', emoji: '🌿' },
  { keyword: 'elaichi', emoji: '🌿' },
  { keyword: 'cinnamon', emoji: '🪵' },
  { keyword: 'clove', emoji: '🌿' },
  { keyword: 'masala', emoji: '🌶' },
  { keyword: 'spice', emoji: '🌶' },

  // Sweeteners
  { keyword: 'jaggery', emoji: '🟫' },
  { keyword: 'bellam', emoji: '🟫' },
  { keyword: 'gur', emoji: '🟫' },
  { keyword: 'sugar', emoji: '🍬' },
  { keyword: 'honey', emoji: '🍯' },

  // Dairy
  { keyword: 'ghee', emoji: '🧈' },
  { keyword: 'butter', emoji: '🧈' },
  { keyword: 'milk', emoji: '🥛' },
  { keyword: 'curd', emoji: '🥛' },
  { keyword: 'yogurt', emoji: '🥛' },
  { keyword: 'paneer', emoji: '🧀' },
  { keyword: 'cheese', emoji: '🧀' },

  // Veg & fruit baskets
  { keyword: 'vegetable', emoji: '🥬' },
  { keyword: 'fruit', emoji: '🍎' },
  { keyword: 'leafy', emoji: '🥬' },
  { keyword: 'green', emoji: '🥬' },

  // Beverages
  { keyword: 'tea', emoji: '🍵' },
  { keyword: 'coffee', emoji: '☕' },
  { keyword: 'juice', emoji: '🧃' },
  { keyword: 'drink', emoji: '🥤' },
  { keyword: 'beverage', emoji: '🥤' },

  // Snacks & misc
  { keyword: 'snack', emoji: '🍿' },
  { keyword: 'biscuit', emoji: '🍪' },
  { keyword: 'cookie', emoji: '🍪' },
  { keyword: 'pickle', emoji: '🫙' },
  { keyword: 'achaar', emoji: '🫙' },
  { keyword: 'sauce', emoji: '🫙' },
  { keyword: 'salt', emoji: '🧂' },
  { keyword: 'cereal', emoji: '🌾' },
  { keyword: 'organic', emoji: '🌱' },
  { keyword: 'pooja', emoji: '🪔' },
  { keyword: 'puja', emoji: '🪔' },
  { keyword: 'agarbatti', emoji: '🕯' },
  { keyword: 'incense', emoji: '🕯' },
];

/**
 * Pick the best-fitting emoji for a category name. Always returns a
 * non-empty string so the UI never renders a blank box.
 */
export function iconForCategory(name: string | undefined | null): string {
  if (!name) return '🛒';
  const lower = name.toLowerCase().trim();
  for (const r of RULES) {
    if (lower.includes(r.keyword)) return r.emoji;
  }
  return '🛒';
}

/**
 * Normalise the display casing of a category name. Backend rows like
 * "palm oil", "Brown Rice", "kismiss" all render as "Palm Oil",
 * "Brown Rice", "Kismiss". Pure presentation — doesn't touch the
 * source row.
 */
export function titleCaseCategory(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
