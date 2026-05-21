import { Category, CategoryColor } from '../types';

export const CATEGORIES: Record<string, Category> = {
  skin: {
    id: 'skin',
    label: 'Skin & Hair Care',
    icon: '🧴',
    className: 'skin',
    count: 34,
  },
  health: {
    id: 'health',
    label: 'Health & Wellness',
    icon: '🌿',
    className: 'health',
    count: 28,
  },
  nutrition: {
    id: 'nutrition',
    label: 'Nutrition & Feeding',
    icon: '🥣',
    className: 'nutrition',
    count: 42,
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep & Routines',
    icon: '😴',
    className: 'sleep',
    count: 19,
  },
  dev: {
    id: 'dev',
    label: 'Development',
    icon: '🧠',
    className: 'dev',
    count: 23,
  },
  school: {
    id: 'school',
    label: 'School & Learning',
    icon: '📚',
    className: 'school',
    count: 15,
  },
  behav: {
    id: 'behav',
    label: 'Behaviour & Emotions',
    icon: '💛',
    className: 'behav',
    count: 31,
  },
  play: {
    id: 'play',
    label: 'Play & Activities',
    icon: '🎨',
    className: 'play',
    count: 26,
  },
  travel: {
    id: 'travel',
    label: 'Travel with Kids',
    icon: '✈️',
    className: 'travel',
    count: 12,
  },
  shop: {
    id: 'shop',
    label: 'Shopping & Products',
    icon: '🛒',
    className: 'shop',
    count: 18,
  },
  hacks: {
    id: 'hacks',
    label: 'Parenting Hacks',
    icon: '💡',
    className: 'hacks',
    count: 22,
  },
  special: {
    id: 'special',
    label: 'Special Needs & Allergies',
    icon: '🌸',
    className: 'special',
    count: 9,
  },
};

export const CATEGORY_COLORS: Record<string, CategoryColor> = {
  skin: { bg: '#FFF0E8', text: '#D84315', border: '#FFD8C2' },
  health: { bg: '#EAF7F0', text: '#1B5E20', border: '#C7EED8' },
  nutrition: { bg: '#FFFDEB', text: '#F57F17', border: '#FFF5C2' },
  sleep: { bg: '#F3EEFF', text: '#512DA8', border: '#E2D5FF' },
  dev: { bg: '#E8F3FF', text: '#0D47A1', border: '#C4E1FF' },
  school: { bg: '#FEE8F4', text: '#880E4F', border: '#FDBBDD' },
  behav: { bg: '#E0F6FB', text: '#006064', border: '#B2EBF2' },
  play: { bg: '#FFFBEA', text: '#7F5E00', border: '#FFEFA8' },
  travel: { bg: '#E2FBF9', text: '#004D40', border: '#B2F4F0' },
  shop: { bg: '#F6EBFF', text: '#4A148C', border: '#ECD2FF' },
  hacks: { bg: '#F1F9F1', text: '#2E7D32', border: '#D3ECD5' },
  special: { bg: '#FFEBEA', text: '#B71C1C', border: '#FFCDCC' },
};
export type CategoryId = keyof typeof CATEGORIES;
