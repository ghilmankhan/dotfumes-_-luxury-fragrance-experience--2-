import { Product } from '../models/types';

const productImagePath = (slug: string, filename: string) => `/images/products/${slug}/${filename}`;

export const FEATURED_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Bold Decision',
    slug: 'bold-decision',
    price: 220,
    description:
      'A commanding extrait built around citrus voltage, cracked pepper, polished woods, and the quiet authority of dusk.',
    shortDescription: 'Citrus voltage, cracked pepper, and polished woods.',
    category: 'Men',
    images: {
      front: productImagePath(
        'bold-decision',
        'dotfumes-bold-decision-extrait-parfum-bottle-front-white-bg.webp',
      ),
      angle: productImagePath(
        'bold-decision',
        'dotfumes-bold-decision-extrait-parfum-bottle-three-quarter-angle-white-bg.webp',
      ),
      flatLay: productImagePath(
        'bold-decision',
        'dotfumes-bold-decision-extrait-parfum-bottle-top-down-flat-lay-white-bg.webp',
      ),
      lifestyle: [
        productImagePath(
          'bold-decision',
          'dotfumes-bold-decision-lifestyle-leadership-dusk-walnut-desk.webp',
        ),
        productImagePath(
          'bold-decision',
          'dotfumes-bold-decision-lifestyle-citrus-pepper-still-life-linen.webp',
        ),
      ],
    },
    notes: {
      top: ['Citrus Peel', 'Black Pepper', 'Cardamom'],
      heart: ['Walnut Wood', 'Sage', 'Dry Amber'],
      base: ['Vetiver', 'Leather', 'Smoked Musk'],
    },
    stock: 10,
  },
  {
    id: '2',
    name: 'Soft Promise',
    slug: 'soft-promise',
    price: 195,
    description:
      'A luminous floral extrait with peony, gardenia, powdered musk, and the intimacy of marble warmed by skin.',
    shortDescription: 'Peony, gardenia, powdered musk, and warm marble.',
    category: 'Women',
    images: {
      front: productImagePath(
        'soft-promise',
        'dotfumes-soft-promise-extrait-parfum-bottle-front-white-bg.webp',
      ),
      angle: productImagePath(
        'soft-promise',
        'dotfumes-soft-promise-extrait-parfum-bottle-three-quarter-angle-white-bg.webp',
      ),
      flatLay: productImagePath(
        'soft-promise',
        'dotfumes-soft-promise-extrait-parfum-bottle-top-down-flat-lay-white-bg.webp',
      ),
      lifestyle: [
        productImagePath(
          'soft-promise',
          'dotfumes-soft-promise-lifestyle-pink-boudoir-marble-tray.webp',
        ),
        productImagePath(
          'soft-promise',
          'dotfumes-soft-promise-lifestyle-floral-bloom-peony-gardenia.webp',
        ),
      ],
    },
    notes: {
      top: ['Pear Skin', 'White Tea', 'Pink Pepper'],
      heart: ['Peony', 'Gardenia', 'Silk Iris'],
      base: ['Powdered Musk', 'Ambrette', 'Blonde Woods'],
    },
    stock: 14,
  },
  {
    id: '3',
    name: 'Wild Silence',
    slug: 'wild-silence',
    price: 185,
    description:
      'A profound journey through volcanic twilight, forest floor, mineral slate, and cold aromatic air.',
    shortDescription: 'Volcanic twilight, forest floor, and mineral air.',
    category: 'Unisex',
    images: {
      front: productImagePath(
        'wild-silence',
        'dotfumes-wild-silence-extrait-parfum-bottle-front-white-bg.webp',
      ),
      angle: productImagePath(
        'wild-silence',
        'dotfumes-wild-silence-extrait-parfum-bottle-three-quarter-angle-white-bg.webp',
      ),
      flatLay: productImagePath(
        'wild-silence',
        'dotfumes-wild-silence-extrait-parfum-bottle-top-down-flat-lay-white-bg.webp',
      ),
      lifestyle: [
        productImagePath(
          'wild-silence',
          'dotfumes-wild-silence-lifestyle-volcanic-plain-twilight.webp',
        ),
        productImagePath(
          'wild-silence',
          'dotfumes-wild-silence-lifestyle-forest-floor-slate-stone.webp',
        ),
      ],
    },
    notes: {
      top: ['Bergamot', 'Pink Pepper', 'Juniper'],
      heart: ['Cedarwood', 'Iris', 'Pine'],
      base: ['Cold Musk', 'Ambergris', 'Oakmoss'],
    },
    stock: 12,
  },
  {
    id: '4',
    name: 'Bleu Heat',
    slug: 'bleu-heat',
    price: 205,
    description:
      'An athletic blue extrait: electric mint, warm cedar, salt skin, and the disciplined heat of dawn.',
    shortDescription: 'Electric mint, warm cedar, salt skin, and dawn heat.',
    category: 'Men',
    images: {
      front: productImagePath(
        'bleu-heat',
        'dotfumes-bleu-heat-extrait-parfum-bottle-front-white-bg.webp',
      ),
      angle: productImagePath(
        'bleu-heat',
        'dotfumes-bleu-heat-extrait-parfum-bottle-three-quarter-angle-white-bg.webp',
      ),
      flatLay: productImagePath(
        'bleu-heat',
        'dotfumes-bleu-heat-extrait-parfum-bottle-top-down-flat-lay-white-bg.webp',
      ),
      lifestyle: [
        productImagePath('bleu-heat', 'dotfumes-bleu-heat-lifestyle-boxing-gym-dawn-athletic.webp'),
        productImagePath(
          'bleu-heat',
          'dotfumes-bleu-heat-lifestyle-wood-plank-still-life-notes.webp',
        ),
      ],
    },
    notes: {
      top: ['Blue Mint', 'Grapefruit', 'Sea Salt'],
      heart: ['Cedar', 'Lavender', 'Hot Stone'],
      base: ['Ambergris', 'White Musk', 'Dry Woods'],
    },
    stock: 11,
  },
  {
    id: '5',
    name: 'First Meet',
    slug: 'first-meet',
    price: 190,
    description:
      'A golden-hour composition of tropical fruit, clean woods, honeyed warmth, and terrace light.',
    shortDescription: 'Tropical fruit, clean woods, honeyed warmth, and terrace light.',
    category: 'Unisex',
    images: {
      front: productImagePath(
        'first-meet',
        'dotfumes-first-meet-extrait-parfum-bottle-front-white-bg.webp',
      ),
      angle: productImagePath(
        'first-meet',
        'dotfumes-first-meet-extrait-parfum-bottle-three-quarter-angle-white-bg.webp',
      ),
      flatLay: productImagePath(
        'first-meet',
        'dotfumes-first-meet-extrait-parfum-bottle-top-down-flat-lay-white-bg.webp',
      ),
      lifestyle: [
        productImagePath(
          'first-meet',
          'dotfumes-first-meet-lifestyle-golden-hour-office-terrace.webp',
        ),
        productImagePath(
          'first-meet',
          'dotfumes-first-meet-lifestyle-tropical-fruit-still-life-travertine.webp',
        ),
      ],
    },
    notes: {
      top: ['Mango Skin', 'Neroli', 'Pink Grapefruit'],
      heart: ['Honeyed Jasmine', 'Fig Leaf', 'Solar Woods'],
      base: ['Travertine Musk', 'Amber', 'Cashmere Wood'],
    },
    stock: 16,
  },
];
