# Marketo Search System Audit

Date: 2026-08-20

## Previous Search Path

| Layer | Previous implementation | Limitation |
| --- | --- | --- |
| Header | `frontend/src/shells/PublicShell.tsx` routed to `/search?q=...` | No live suggestions |
| Search page | `frontend/src/pages/pub/SearchPage.tsx` called `/api/products?search=...` | Price, rating, shipping, sort, and pagination were simulated in React |
| API client | `frontend/src/api/catalog.ts` exposed `fetchCatalogProducts({ search })` | No pagination metadata or interpreted query |
| Controller | `CatalogController::products` used `%whole query%` across a few fields | Literal phrase matching, no relevance score, no typo recovery |
| Database | Products, categories, sellers, tags, reviews, and order items existed | Search did not use tags, parent categories, ratings, or sales signals |

Local filtering in seller inventory, account orders, and admin tables is scoped to already-loaded private dashboard data. It is not public marketplace search and remains local intentionally.

## Search Inventory

| File / area | Data source | Search/filter behavior | Decision |
| --- | --- | --- | --- |
| `frontend/src/shells/PublicShell.tsx` | Laravel `/api/search/suggestions` | Main desktop/mobile marketplace query submission; desktop suggestions are debounced | Canonical public search entry point |
| `frontend/src/pages/pub/SearchPage.tsx` | Laravel `/api/search` | Query, price, rating, shipping, sort, and pagination | Fully backend-driven |
| `frontend/src/pages/pub/CategoryPage.tsx` | Laravel `/api/products` | Category browsing plus local display refinements | Not a free-text search; retained for current category UX |
| `frontend/src/pages/pub/HomePage.tsx` | Laravel `/api/products` | Local deal sections from already-loaded discovery products | Not search |
| `frontend/src/pages/seller/ProductListPage.tsx` | Seller API | Owner-only list query/filter | Private dashboard concern, not public marketplace search |
| `frontend/src/pages/seller/InventoryPage.tsx` | Seller API | Owner-only SKU/product filter | Private dashboard concern, not public marketplace search |
| `frontend/src/pages/orders/OrderHistoryPage.tsx` | Buyer orders API | Local order ID/product/seller filter | Account history filter, not marketplace discovery |
| Admin user/seller/order/report pages | Admin APIs or remaining scaffold data | Local operational table filters | Admin operations; migrate separately as datasets grow |
| `frontend/src/pages/pub/data.ts` | Static design-era data | Category labels and legacy mock exports | Not used by the canonical marketplace search endpoint |

No public marketplace query is now ranked by a React `.filter()` or a hardcoded suggestion array.

## Canonical Contract

Public marketplace search now uses:

`GET /api/search?q=&category=&seller=&min_price=&max_price=&min_rating=&free_shipping=&sort=&page=&per_page=`

Header suggestions use:

`GET /api/search/suggestions?q=&limit=`

`/api/products` remains available for existing home and category discovery callers; new marketplace search behavior is centralized in `App\Services\ProductSearchService`.

## Searchable Public Fields

- Product name
- Product description
- Product SKU
- Product tags
- Category and parent-category names
- Seller trade name and business name

There is no dedicated brand column. Existing brand-like data is searchable when represented in a product name or tags. Private seller contact, legal, document, moderation, and payout fields are never queried or returned.

## Normalization and Tokens

- Trim leading/trailing whitespace.
- Collapse repeated whitespace.
- Compare case-insensitively.
- Convert punctuation to separators while preserving letters, numbers, hyphens, and plus signs so identifiers such as `USB-C`, `RTX 5070`, and `PS5` remain meaningful.
- Ignore tokens shorter than two characters.
- Use the full normalized phrase and individual meaningful tokens.
- Partial/fuzzy matching starts at four characters.

## Synonyms

Synonyms are maintained in `backend/config/search.php`. Query expansion retains the original terms and adds focused English and Philippine-commerce equivalents such as earphones/earbuds, cellphone/smartphone, rubber shoes/sneakers, and ref/refrigerator.

## Candidate and Typo Strategy

The database first retrieves a bounded candidate set using the normalized phrase, expanded tokens, and three-character name fragments. A maximum of 500 candidates is loaded. Levenshtein similarity is then calculated only against candidate title tokens, with a default threshold of 0.72. This avoids loading the complete catalog into React or running unrestricted similarity work over every product.

## Relevance Rules

Approximate score order:

| Signal | Weight |
| --- | ---: |
| Exact product name | 1000 |
| Exact SKU | 700 |
| Product name starts with phrase | 650 |
| Phrase appears in product name | 500 |
| All original tokens matched in title | 260 bonus |
| Original title token | 110 each |
| Category / parent category | 75 / 65 each |
| Product tags | 70 each |
| Partial title token | 65 each |
| Public seller/store name | 55 each |
| Controlled fuzzy title token | 45 each |
| Description-only token | 18 each |

Synonym matches receive lower weights than original terms. Text relevance is the primary default sort. In-stock state, rating, and review count are tie-breakers only. Explicit user sorts override relevance as requested.

## Visibility and Inventory

Only active, non-deleted products from approved, non-deleted sellers whose user account is active are searchable. Existing Marketo behavior keeps out-of-stock products visible, so they remain searchable but rank below in-stock products when textual relevance ties.

## Pagination and Performance

- Default page size: 24.
- Maximum page size: 48.
- Candidate cap: 500.
- Composite indexes support status/date, category/status, seller/status, and status/price filters.
- Seller status/name and category active/name indexes support public relationship filtering.
- MySQL FULLTEXT was evaluated but deferred: current search must remain compatible with SQLite tests and controlled token/synonym/fuzzy scoring. A future engine can replace the service internals without changing the frontend contract.

## Remaining Search Implementations

- Home and category pages use `/api/products` for normal catalog browsing.
- Seller inventory and dashboard/admin list searches filter data already loaded for the authorized owner/operator. These are not public marketplace discovery and should move to paginated backend endpoints as those private datasets grow.
- Some admin pages still contain scaffold/mock datasets; they are outside this public marketplace search change.

## Future Upgrade Path

When catalog scale exceeds the bounded MySQL candidate strategy, preserve `/api/search` and replace `ProductSearchService` internals with Laravel Scout plus Meilisearch, Typesense, or OpenSearch. Migrate synonym dictionaries, visibility filters, and field weights into the selected engine rather than changing frontend pages.
