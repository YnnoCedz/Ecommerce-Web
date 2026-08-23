# Maketo Product Page Live Data Audit

Date: 2026-08-20

The public React route is `/p/:id` and the page resolves the route value as a product slug. The backing Laravel routes are `GET /api/products/{slug}` and `GET /api/products/{slug}/reviews`.

## Final Classification

| Section | Status | Source and behavior |
| --- | --- | --- |
| Product core | LIVE | `products`, `categories`, and the public catalog API provide name, description, pricing, SKU, barcode, dimensions, and status. |
| Images | LIVE | Ordered `product_images` are resolved through `MediaStorageService`; missing images use the shared Maketo SVG placeholder. |
| Variants | LIVE | Active `product_variants` and options provide price, SKU, stock, and the submitted cart `product_variant_id`. |
| Stock | LIVE | Product or selected-variant inventory controls availability and quantity; Laravel performs final validation. |
| Seller information | LIVE | Public store name, slug, logo, verification, location, description, and joined year come from `sellers`. Private seller fields are not returned. |
| Seller rating | LIVE | Average rating is calculated from approved reviews across the seller's products. |
| Seller review count | LIVE | Count is calculated from approved seller reviews. |
| Seller trust metrics | PARTIAL | Fulfilled orders, units sold, and follower count are database aggregates. Response-time/rate are omitted because no reliable event-derived response tracking exists. |
| Reviews | LIVE | Approved reviews load from a public paginated endpoint with privacy-safe buyer names, verified-purchase status, helpful count, and seller reply. |
| Review summary | LIVE | Average, count, and 1-to-5 distribution are database aggregates. Zero reviews return zero values. |
| Review images | NOT_IMPLEMENTED | No review-image table or current ProductPage upload/display requirement exists. The API returns an empty image list. |
| Helpful voting | NOT_IMPLEMENTED | Existing counts can be displayed, but no buyer vote persistence endpoint exists, so the ProductPage does not present a fake action. |
| Shipping policy | LIVE | Seller `shipping_policy` is used, with a backend-configured marketplace default when blank. |
| Return policy | LIVE | Seller `return_policy` is used, with a backend-configured marketplace default when blank. |
| Delivery estimate | STATIC | Backend configuration returns a truthful checkout-time estimate message; no carrier/zone estimator exists. |
| Related products | LIVE | Active products in the same category are ranked by rating, completed sales, then publication date; current and non-public products are excluded. |
| Cart | LIVE | Authenticated POST to Laravel persists cart items. Variant ownership, required selection, product visibility, and stock are validated server-side. |
| Wishlist | LIVE | Authenticated status/add/remove operations persist in `wishlist_items`; success toasts occur only after API success. |
| Review submission | LIVE | Creation/edit/delete remains under `/account/reviews`; ProductPage does not duplicate that workflow. |

## Removed Mock Content

- Three hardcoded customer reviews and their helpful counts.
- Fabricated rating-distribution bars.
- Placeholder seller rating and review counts.
- Static shipping speed, express-delivery, and 15-day return promises.
- Watch-specific gallery fallback and unrelated Unsplash product fallback.
- Placeholder seller banner and response-time claims in the public catalog payload.

## Verified Purchase Rule

A public review is marked verified only when its order item belongs to the reviewing user and the parent order is `delivered` or `completed`. React cannot set or override this value.

## Visibility Rules

Public product and review endpoints require all of the following:

- Product status is `active` and the product is not soft-deleted.
- Seller status is `approved` and the seller is not soft-deleted.
- Seller user account status is `active`.

## Performance

- Product, related-product, and seller rating/sales values use SQL aggregates.
- Images, variants/options, category, seller, and seller categories use eager loading.
- Review list pagination defaults to 10 and caps at 50.
- Review list supports `newest`, `highest_rating`, `lowest_rating`, and `most_helpful`; no sorting UI was added because the current page has none.

## Test Evidence

- `ProductPageLiveDataTest` verifies 5-star plus 4-star reviews produce a 4.5 average and count of 2.
- The same test verifies seller-wide aggregation, verified purchase, privacy-safe output, seller replies, pagination, policies, image URL/fallback, related products, and hidden seller behavior.
- Browser verification against the local MySQL-backed `organic-lavender-serum` page confirmed real zero states, backend policy defaults, seller aggregates, related products, and no demo reviews.

## Remaining Work

- Review image upload/display can be added later if the product specification introduces it.
- Helpful voting requires a normalized per-user vote table and endpoint before the count should become interactive.
- Delivery dates require real shipping zones/carrier estimates; until then the page correctly defers estimates to checkout.
- Seller response metrics require message-response event tracking before they can be shown as trustworthy public statistics.
