
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
  skincare: { bg: '#FFF0E8', text: '#D84315', border: '#FFD8C2' },
  school: { bg: '#FEE8F4', text: '#880E4F', border: '#FDBBDD' },
  kids_growth: { bg: '#EAF7F0', text: '#1B5E20', border: '#C7EED8' },
  active_kids: { bg: '#E8F3FF', text: '#0D47A1', border: '#C4E1FF' },
  parenting_hacks: { bg: '#F1F9F1', text: '#2E7D32', border: '#D3ECD5' },
};

export type CategoryId = keyof typeof CATEGORIES;
