import { Product, Trending } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'sunscreen',
    name: 'Tuco Kids Daily Shield Sunscreen SPF 50',
    icon: '☀️',
    subtitle: '100% Mineral · Sweat & Water Resistant · Non-Greasy',
    tag: '⭐ Best Seller',
    price: '₹449',
    linkUrl: 'https://tucokids.com/products/sunscreen',
  },
  {
    id: 'shampoo',
    name: 'Tuco Kids Gentle Cleanse Shampoo',
    icon: '🧴',
    subtitle: 'With Coconut Oil & Aloe Vera · Tear-Free',
    tag: '🌿 dermatologist tested',
    price: '₹379',
    linkUrl: 'https://tucokids.com/products/shampoo',
  },
  {
    id: 'bodywash',
    name: 'Tuco Kids Soft Skin Body Wash',
    icon: '🫧',
    subtitle: 'With Oat Straw & Calendula · Hydrates & Calms Skin',
    tag: '💧 No Parabens',
    price: '₹399',
    linkUrl: 'https://tucokids.com/products/bodywash',
  },
  {
    id: 'moisturiser',
    name: 'Tuco Kids Nourish Night Moisturiser',
    icon: '🌙',
    subtitle: 'With Shea Butter & Ceramides · Eczema Safe',
    tag: '✨ Eczema-Prone Safe',
    price: '₹429',
    linkUrl: 'https://tucokids.com/products/moisturiser',
  },
];

export const TRENDING: Trending[] = [
  {
    id: 1,
    rank: '01',
    title: 'Best sunscreen for outdoor cricket this summer?',
    meta: '14 replies · Skin & Hair Care',
  },
  {
    id: 41,
    rank: '02',
    title: 'Toddler refuses all vegetables — help!',
    meta: '9 replies · Nutrition & Feeding',
  },
  {
    id: 61,
    rank: '03',
    title: '4-year-old won\'t sleep before 11 PM',
    meta: '7 replies · Sleep & Routines',
  },
  {
    id: 78,
    rank: '04',
    title: '2.5-year-old not talking yet — should I worry?',
    meta: '6 replies · Development',
  },
  {
    id: 112,
    rank: '05',
    title: 'Public meltdowns — my 4yo is a tantrum machine',
    meta: '5 replies · Behaviour & Emotions',
  },
];
