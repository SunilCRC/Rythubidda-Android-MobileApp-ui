import type { Category } from '../types';

/**
 * Turns the shop API's FLAT category list into the same tree the
 * website shows: active top-level parents (API order = admin
 * position), each carrying its active children.
 *
 * Mirrors Rythubidda-UI `CategoryService.transformCategories`:
 *   • only `isActive === 1` rows
 *   • a child is kept only when its parent is present and active
 *   • the backend's "All Products" / "All" seed row is dropped
 *     (both apps render their own "All" entry)
 */

const isAll = (c: Category) => {
  const n = (c.name ?? '').trim().toLowerCase();
  return n === 'all products' || n === 'all';
};

const isActive = (c: Category) =>
  c.isActive === 1 || c.isActive === true || c.isActive === undefined;

export const categoryIdOf = (c: Category): number =>
  Number(c.id ?? c.categoryId ?? 0);

const parentIdOf = (c: Category): number => Number(c.parentId ?? 0);

export function buildCategoryTree(flat: Category[]): Category[] {
  const active = flat.filter(c => isActive(c) && !isAll(c));
  const parents = active.filter(c => parentIdOf(c) === 0);
  return parents.map(p => ({
    ...p,
    children: active.filter(c => parentIdOf(c) === categoryIdOf(p)),
  }));
}

/** Active children of one parent id, in API (position) order. */
export function childrenOf(flat: Category[], parentId: number): Category[] {
  return flat.filter(
    c => isActive(c) && !isAll(c) && parentIdOf(c) === parentId,
  );
}
