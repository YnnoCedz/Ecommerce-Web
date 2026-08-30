# Maketo Flutter design guide

This guide is the mobile counterpart of Maketo's existing web system. The web palette is warm and editorial: Fraunces-style display headings, Outfit-style UI text, an ink/cream foundation, navy actions, amber commerce accents, and restrained status colors. The starter implementation lives in `mobile/lib/core` and is intentionally independent of the Laravel API.

## Architecture and tokens

The recommended app structure is `core/theme`, `core/errors`, `core/network`, `core/utils`, and `core/widgets`, with feature folders under `features/<feature>/{data,domain,presentation}`. Keep API contracts in feature data layers and keep presentation widgets dependent on tokens rather than raw values. `AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`, and `AppShadows` are the source of truth.

### Color

Use `AppColors.ground` (`#F8F7F3`) for page backgrounds, `surfaceElevated` for cards and fields, `ink` for primary text, `inkMuted` for supporting text, `border` for dividers, `navy` for primary actions and links, and `amber` for prices and commerce emphasis. Use `green`, `warning`, `red`, and `violet` only for meaning, never decoration. The status helpers map Pending, Processing, To Ship, Shipped, Out for Delivery, Delivered, Cancelled, Returned, Refunded, and Disputed to a readable foreground/background pair.

### Type

Use `ThemeData.textTheme` and `AppTypography` together. `display` and `pageTitle` are reserved for page-level Fraunces-style headings; `sectionTitle`, `cardTitle`, `body`, `bodySmall`, and `caption` form the Outfit-style UI hierarchy. Use `priceLarge`, `price`, and `priceOld` for money. Prices are always formatted by a shared `AppPrice` widget; do not add currency symbols to API values.

### Spacing, radius, and elevation

Use the 4/8/12/16/20/24/32/40/48 scale (`AppSpacing`) and compose `EdgeInsets` from those values. Cards use 8px corners; controls use 8px corners; status badges use pill corners. `AppShadows.card` is a small, soft shadow for elevated cards. Prefer borders and surface changes over large shadows.

## Shared components

The starter exports `AppScaffold`, `AppCard`, `AppSectionHeader`, `AppPrimaryButton`, `AppOutlineButton`, `AppTextField`, `AppSearchField`, `AppNetworkImage`, `AppPrice`, `AppStatusBadge`, `AppEmptyState`, `AppErrorState`, `AppQuantitySelector`, `AppProductCard`, and `AppSnackbar` from `core/widgets/app_widgets.dart`.

Buttons must expose loading and disabled states, preserve a 44–48px touch target, and use primary/outline/text variants consistently. Inputs support labels, hints, helper/error text, prefix/suffix affordances, read-only state, and semantic labels. Dropdowns, checkboxes, radios, switches, and password fields should wrap the same `InputDecorationTheme` rather than inventing a second style.

`AppSearchField` is the standard search bar. Keep filtering and submit behavior in the feature, not in the widget. `AppQuantitySelector` is compact and must validate stock in the feature controller before persisting a change.

## Images and cards

`AppNetworkImage` provides loading and failure placeholders, a configurable `BoxFit`, and clipping. Resolve images in this order: selected variant image, product primary image, first product image, then placeholder. Never render a broken image or expose a URL/exception to a buyer. Product cards use a square or near-square image area, `BoxFit.contain` for products such as electronics, a two-column phone grid, product name, `AppPrice`, optional old price/discount, rating, seller, stock, and wishlist action. Store cards show logo/name, rating, follower/sales signal, and a clear “Visit store” action.

Order cards replace desktop tables: seller and order ID, status badge, thumbnail, title/variant/quantity, total, and one contextual action. Keep cart cards grouped by seller with seller header, visit-store action, item controls, delivery information, and seller subtotal. Checkout is a vertical set of delivery address, seller groups, delivery method, voucher, payment, and summary sections with a sticky `Place Order` CTA that always shows subtotal, shipping, discount, and total.

## Navigation and page composition

Buyer navigation uses five main destinations: Home, Categories, Cart, Orders, and Account. Wishlist belongs in the app bar or Account and should not overload the bottom bar. Use badges for cart quantity and unread notifications. Home app bars contain brand, search, notifications, and optionally wishlist; inner app bars contain back, title, and only contextual actions.

Home order is app bar, search, promotion, categories, recommended products, optional deals, featured stores, recently viewed, and suggested products. Product details order is gallery, title, rating/sold, price/discount, variants, stock, shipping, store, description, reviews, and recommendations, with a sticky Add to Cart/Buy Now area. Orders use tabs for All, To Pay, To Ship, To Receive, Completed, Cancelled, and Returns. Seller screens should use metric cards, lists, tabs, and bottom sheets rather than shrunken desktop tables.

## Feedback and errors

Use `AppSnackbar` for short, human-readable success/error/warning/info messages. Map all HTTP, Dio, Laravel, validation, timeout, and connectivity failures through `AppErrorMapper` in `core/errors/app_error_mapper.dart`. Buyers must never see SQLSTATE, stack traces, raw response bodies, exception class names, or technical validation objects. Log technical detail only in debug builds or an approved monitoring service. Use `AppEmptyState` for empty cart/wishlist/orders/search, `AppErrorState` with Try again/Go back, and skeletons for product cards, store cards, orders, home sections, and product detail loading. Use full-screen progress only when the entire page cannot render.

Dialogs confirm destructive actions and use plain language. Bottom sheets are appropriate for filters, variant selection, delivery methods, and mobile seller actions. Snackbars should not be the only confirmation for an order or payment; show a durable confirmation state/page as well.

## Responsive and accessible behavior

Design for small, normal, and large phones plus tablets with `LayoutBuilder`, `MediaQuery`, `ConstrainedBox`, `Wrap`, and `SliverGridDelegate`; do not hardcode device widths. Preserve content width and avoid horizontal scrolling. Every interactive control needs a semantic label, at least a 44–48px target, visible focus state, adequate contrast, and a non-color status cue. Respect text scaling and reduced motion. Keep colors behind semantic names so dark mode can be added via `buildDarkTheme()` without rewriting widgets; avoid literal black/white in feature UI.

## Dark mode preparation

Use `Theme.of(context).colorScheme`, `textTheme`, and the token classes. `buildLightTheme()` is the current production baseline; `buildDarkTheme()` establishes the alternate surface/text scheme. Add component-specific `ThemeExtension`s only when a token cannot be represented by the standard scheme.

## Showcase and adoption

`features/design_system/presentation/design_system_page.dart` is a development showcase of colors-by-use, typography, buttons, inputs, product cards, badges, empty state, quantity control, and snackbar behavior. `main.dart` launches it as a standalone starter. In a real app, expose this route only behind a debug flag and replace its home route with the buyer shell. Migrate one feature at a time: page scaffold, section composition, cards, then feedback/error states. Keep Laravel endpoints and authentication behavior unchanged while adopting the visual layer.

## Quality checklist

- Prefer `const` constructors and token values over magic numbers.
- Keep data/domain/presentation boundaries clear.
- Validate inventory, permissions, and totals on the backend; the Flutter UI is not authoritative.
- Cache images where appropriate, but retain an error placeholder.
- Test loading, empty, error, disabled, offline, and text-scaled states.
- Run `flutter analyze` and `flutter test` from `mobile/` before shipping.
