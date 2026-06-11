import { Category, CategoryColor } from '../types';
export const CATEGORIES: Record<string, Category> = {
  skincare: {
    id: 'skincare',
    label: 'Skincare, haircare & personal care',
    icon: '🧴',
    className: 'skincare',
    count: 34,
  },
  school: {
    id: 'school',
    label: 'School & Learning',
    icon: '📚',
    className: 'school',
    count: 28,
  },
  kids_growth: {
    id: 'kids_growth',
    label: 'Kids & Growth',
    icon: '🌱',
    className: 'kids_growth',
    count: 42,
  },
  active_kids: {
    id: 'active_kids',
    label: 'Active Kids',
    icon: '🏃',
    className: 'active_kids',
    count: 22,
  },
  parenting_hacks: {
    id: 'parenting_hacks',
    label: 'Parenting Hacks',
    icon: '💡',
    className: 'parenting_hacks',
    count: 19,
  },
};
export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  skincare: { bg: '#E7F9FF', text: '#4D4747', border: '#E7F9FF' },
  school: { bg: '#E7F9FF', text: '#4D4747', border: '#E7F9FF' },
  kids_growth: { bg: '#E7F9FF', text: '#4D4747', border: '#E7F9FF' },
  active_kids: { bg: '#E7F9FF', text: '#4D4747', border: '#E7F9FF' },
  parenting_hacks: { bg: '#E7F9FF', text: '#4D4747', border: '#E7F9FF' },
};
export type CategoryId = keyof typeof CATEGORIES;
