import { Product } from "../models/types";

export const FEATURED_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Wild Silence",
    slug: "wild-silence",
    price: 185,
    description: "A profound journey through damp earth and silver mist. Notes of bergamot, cedarwood, and cold musk.",
    shortDescription: "A profound journey through damp earth and silver mist.",
    category: "Unisex",
    images: {
      hero: "/images/products/wild-silence-hero.webp",
      transparent: "/images/products/wild-silence-cutout.webp",
      lifestyle: ["/images/story/story-campaign.webp"]
    },
    notes: {
      top: ["Bergamot", "Pink Pepper", "Juniper"],
      heart: ["Cedarwood", "Iris", "Pine"],
      base: ["Cold Musk", "Ambergris", "Oakmoss"]
    },
    stock: 12
  },
  {
    id: "2",
    name: "Midnight Echo",
    slug: "midnight-echo",
    price: 210,
    description: "Velvety layers of dark vanilla and smoked oud. A scent for those who command the night.",
    shortDescription: "Velvety layers of dark vanilla and smoked oud.",
    category: "Unisex",
    images: {
      hero: "/images/products/midnight-echo-hero.webp",
      transparent: "/images/products/midnight-echo-cutout.webp",
      lifestyle: ["/images/campaign/midnight-echo-campaign.webp"]
    },
    notes: {
      top: ["Saffron", "Leather"],
      heart: ["Smoked Oud", "Rose"],
      base: ["Dark Vanilla", "Patchouli", "Sandalwood"]
    },
    stock: 8
  },
  {
    id: "3",
    name: "Velvet Dust",
    slug: "velvet-dust",
    price: 165,
    description: "Soft powdered iris and white suede. Minimalist, clean, and undeniably sophisticated.",
    shortDescription: "Soft powdered iris and white suede.",
    category: "Women",
    images: {
      hero: "/images/products/velvet-dust-hero.webp",
      transparent: "/images/products/velvet-dust-cutout.webp",
      lifestyle: ["/images/campaign/velvet-dust-campaign.webp"]
    },
    notes: {
      top: ["Aldehydes", "White Tea"],
      heart: ["Powdered Iris", "Cotton"],
      base: ["White Suede", "Ambrette", "Musk"]
    },
    stock: 15
  }
];
