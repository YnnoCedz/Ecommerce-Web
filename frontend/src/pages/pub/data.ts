export type Product = {
  id: string;
  slug: string;
  name: string;
  seller: string;
  sellerSlug: string;
  category: string;
  price: number;
  originalPrice?: number;
  rating: number;
  ratingCount: number;
  soldCount: number;
  image: string;
  badge?: string;
  inStock: boolean;
  freeShipping: boolean;
};

export type Seller = {
  slug: string;
  name: string;
  initials: string;
  category: string;
  rating: number;
  ratingCount: number;
  productCount: number;
  followerCount: number;
  responseRate: number;
  responseTime: string;
  joinedYear: number;
  verified: boolean;
  banner: string;
  location: string;
  description: string;
};

export const PRODUCTS: Product[] = [
  { id: "p1", slug: "minimalist-chronograph-watch", name: "Minimalist Chronograph Watch", seller: "Artisan Goods Co.", sellerSlug: "artisan-goods", category: "Jewelry and Watches", price: 4200, originalPrice: 5800, rating: 4.7, ratingCount: 218, soldCount: 1420, image: "https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d", badge: "SALE", inStock: true, freeShipping: true },
  { id: "p2", slug: "low-top-canvas-sneakers", name: "Low-Top Canvas Sneakers", seller: "SoleSource PH", sellerSlug: "solesource", category: "Men's Apparel", price: 2350, rating: 4.4, ratingCount: 89, soldCount: 540, image: "https://images.unsplash.com/photo-1544441893-675973e31985", inStock: true, freeShipping: false },
  { id: "p3", slug: "genuine-leather-tote-bag", name: "Genuine Leather Tote Bag", seller: "StyleHouse PH", sellerSlug: "stylehouse", category: "Women's Apparel", price: 2800, originalPrice: 3400, rating: 4.9, ratingCount: 341, soldCount: 2100, image: "https://images.unsplash.com/photo-1616529484745-85f885b9889a", badge: "NEW", inStock: true, freeShipping: true },
  { id: "p4", slug: "handmade-ceramic-bowl-set", name: "Handmade Ceramic Bowl Set (3 pcs)", seller: "Craftworks PH", sellerSlug: "craftworks", category: "Home and Garden", price: 850, rating: 4.6, ratingCount: 54, soldCount: 280, image: "https://images.unsplash.com/photo-1607556672044-6110fc499247", inStock: true, freeShipping: false },
  { id: "p5", slug: "knitted-wool-beanie", name: "Hand-Knitted Wool Beanie", seller: "Craftworks PH", sellerSlug: "craftworks", category: "Women's Apparel", price: 480, originalPrice: 650, rating: 4.8, ratingCount: 112, soldCount: 860, image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2", badge: "SALE", inStock: true, freeShipping: false },
  { id: "p6", slug: "natural-skincare-set", name: "Natural Botanical Skincare Set", seller: "GlowCraft PH", sellerSlug: "glowcraft", category: "Health and Beauty", price: 1200, originalPrice: 1500, rating: 4.5, ratingCount: 203, soldCount: 1650, image: "https://images.unsplash.com/photo-1748543668676-ea8241cb3886", inStock: true, freeShipping: true },
  { id: "p7", slug: "serum-collection", name: "Vitamin C + Hyaluronic Serum Duo", seller: "GlowCraft PH", sellerSlug: "glowcraft", category: "Health and Beauty", price: 890, rating: 4.7, ratingCount: 158, soldCount: 920, image: "https://images.unsplash.com/photo-1748543668646-e81cda0890f3", inStock: true, freeShipping: false },
  { id: "p8", slug: "leather-oxford-shoes", name: "Classic Full-Grain Leather Oxfords", seller: "SoleSource PH", sellerSlug: "solesource", category: "Men's Apparel", price: 3800, rating: 4.3, ratingCount: 67, soldCount: 390, image: "https://images.unsplash.com/photo-1467043237213-65f2da53396f", inStock: true, freeShipping: true },
];

export const SELLERS: Seller[] = [
  { slug: "artisan-goods", name: "Artisan Goods Co.", initials: "AG", category: "Home and Garden", rating: 4.8, ratingCount: 1420, productCount: 142, followerCount: 8400, responseRate: 98, responseTime: "within 1 hour", joinedYear: 2021, verified: true, banner: "https://images.unsplash.com/photo-1780798464793-be53ffd37b79", location: "Makati, Metro Manila", description: "We source and craft premium homeware and lifestyle products from local artisans across the Philippines. Each piece tells a story of Filipino craftsmanship." },
  { slug: "solesource", name: "SoleSource PH", initials: "SS", category: "Men's Apparel", rating: 4.6, ratingCount: 870, productCount: 87, followerCount: 5200, responseRate: 95, responseTime: "within 3 hours", joinedYear: 2022, verified: true, banner: "https://images.unsplash.com/photo-1677055089360-c2aa1ac5d20e", location: "BGC, Taguig", description: "Curated footwear for every occasion. We carry quality shoes from local and international brands, with expert fit advice from our team." },
  { slug: "stylehouse", name: "StyleHouse PH", initials: "SH", category: "Women's Apparel", rating: 4.9, ratingCount: 2100, productCount: 234, followerCount: 22000, responseRate: 99, responseTime: "within 30 minutes", joinedYear: 2020, verified: true, banner: "https://images.unsplash.com/photo-1467043237213-65f2da53396f", location: "Quezon City, Metro Manila", description: "Premium fashion and accessories. StyleHouse is your destination for timeless pieces that blend modern design with lasting quality." },
  { slug: "craftworks", name: "Craftworks PH", initials: "CW", category: "Home and Garden", rating: 4.8, ratingCount: 560, productCount: 56, followerCount: 3800, responseRate: 97, responseTime: "within 2 hours", joinedYear: 2022, verified: true, banner: "https://images.unsplash.com/photo-1595351298020-038700609878", location: "Cebu City", description: "Handmade with love in Cebu. Every product is individually crafted by our small team of local artisans. No two pieces are exactly alike." },
  { slug: "glowcraft", name: "GlowCraft PH", initials: "GC", category: "Health and Beauty", rating: 4.5, ratingCount: 930, productCount: 93, followerCount: 11200, responseRate: 96, responseTime: "within 2 hours", joinedYear: 2021, verified: true, banner: "https://images.unsplash.com/photo-1748543668751-902d6461890d", location: "Pasig, Metro Manila", description: "Natural, locally-formulated skincare and wellness products. All ingredients are ethically sourced. Cruelty-free and dermatologist-tested." },
];

// ── Canonical product categories ──────────────────────────────
// Single source of truth for the 12 platform categories. Every
// category surface (nav, filters, forms, admin, breadcrumbs) should
// derive from this list so names and slugs never drift.
export type Category = {
  slug: string;
  label: string;
  count: number;
  image: string;
  subs: string[];
};

export const CATEGORIES: Category[] = [
  { slug: "pet-supplies",     label: "Pet Supplies",                  count: 1840, image: "https://images.unsplash.com/photo-1450778869180-41d0601e046e", subs: ["Dog Supplies", "Cat Supplies", "Pet Food", "Aquariums & Fish", "Small Animals", "Grooming"] },
  { slug: "electronics",      label: "Electronics and Gadgets",        count: 4820, image: "https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d", subs: ["Phones & Tablets", "Computers & Laptops", "Audio & Headphones", "Cameras", "Smart Home", "Accessories"] },
  { slug: "womens-apparel",   label: "Women's Apparel",                count: 8200, image: "https://images.unsplash.com/photo-1483985988355-763728e1935b", subs: ["Dresses", "Tops", "Bottoms", "Outerwear", "Activewear", "Lingerie"] },
  { slug: "mens-apparel",     label: "Men's Apparel",                  count: 6100, image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e", subs: ["Shirts", "Trousers", "Outerwear", "Activewear", "Suits", "Underwear"] },
  { slug: "kids-baby",        label: "Kids and Baby",                  count: 3400, image: "https://images.unsplash.com/photo-1522771930-78848d9293e8", subs: ["Baby Clothing", "Kids Clothing", "Diapering", "Feeding", "Toys", "Nursery"] },
  { slug: "home-garden",      label: "Home and Garden",                count: 6240, image: "https://images.unsplash.com/photo-1607556672044-6110fc499247", subs: ["Kitchen & Dining", "Bedding & Bath", "Decor", "Garden & Outdoor", "Lighting", "Storage"] },
  { slug: "sports-outdoors",  label: "Sports and Outdoors",            count: 2150, image: "https://images.unsplash.com/photo-1677055089360-c2aa1ac5d20e", subs: ["Fitness Equipment", "Camping & Hiking", "Team Sports", "Cycling", "Water Sports", "Supplements"] },
  { slug: "books-media",      label: "Books and Media",                count: 2980, image: "https://images.unsplash.com/photo-1512820790803-83ca734da794", subs: ["Fiction", "Non-fiction", "Children's Books", "Textbooks", "Music & Vinyl", "Films & Series"] },
  { slug: "food-gourmet",     label: "Food and Gourmet",               count: 1720, image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061", subs: ["Snacks", "Beverages", "Pantry Staples", "Coffee & Tea", "Baking", "Specialty & Organic"] },
  { slug: "jewelry-watches",  label: "Jewelry and Watches",            count: 5600, image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a", subs: ["Watches", "Necklaces", "Rings", "Earrings", "Bracelets", "Fine Jewelry"] },
  { slug: "furniture-office", label: "Furniture and Office Equipment", count: 3120, image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c", subs: ["Living Room", "Bedroom", "Office Desks", "Office Chairs", "Storage & Shelving", "Printers & Supplies"] },
  { slug: "health-beauty",    label: "Health and Beauty",              count: 3890, image: "https://images.unsplash.com/photo-1748543668676-ea8241cb3886", subs: ["Skincare", "Makeup", "Haircare", "Fragrances", "Personal Care", "Vitamins & Wellness"] },
];

// Convenience lists derived from the canonical source.
export const CATEGORY_LABELS: string[] = CATEGORIES.map(c => c.label);
export const categoryBySlug = (slug: string): Category | undefined => CATEGORIES.find(c => c.slug === slug);
export const categoryByLabel = (label: string): Category | undefined => CATEGORIES.find(c => c.label === label);

export const WATCH_GALLERY = [
  "https://images.unsplash.com/photo-1628911774602-74a0cfee9b0d",
  "https://images.unsplash.com/photo-1670177257750-9b47927f68eb",
  "https://images.unsplash.com/photo-1670404160620-a3a86428560e",
  "https://images.unsplash.com/photo-1600003014637-ff82a275e191",
  "https://images.unsplash.com/photo-1524805444758-089113d48a6d",
];
