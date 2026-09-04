# Marketo Store Management Backend Plan

Date: 2026-08-19

This note maps the current seller store-management UI to the real backend fields that now power it.

## Live Fields

| Frontend field | Backend field | Model | Table / Column | API field | Validation | Persistence target |
| --- | --- | --- | --- | --- | --- | --- |
| Store name | `business_name` | `Seller` | `sellers.business_name` | `business_name` | required string max 255 | Seller profile |
| Store slug | `slug` | `Seller` | `sellers.slug` | `slug` | server-normalized, unique | Seller profile |
| Tagline | `tagline` | `Seller` | `sellers.tagline` | `tagline` | nullable string max 255 | Seller profile |
| Store description | `description` | `Seller` | `sellers.description` | `description` | nullable string max 5000 | Seller profile |
| Public email | `public_email` | `Seller` | `sellers.public_email` | `public_email` | nullable email | Seller profile |
| Public phone / Viber | `messaging_phone` | `Seller` | `sellers.messaging_phone` | `messaging_phone` | nullable string max 30 | Seller profile |
| Address line 1 | `address_line1` | `Seller` | `sellers.address_line1` | `address_line1` | nullable string max 255 | Seller profile |
| Address line 2 | `address_line2` | `Seller` | `sellers.address_line2` | `address_line2` | nullable string max 255 | Seller profile |
| City / Municipality | `city` | `Seller` | `sellers.city` | `city` | nullable string max 255 | Seller profile |
| Province / Region | `province` | `Seller` | `sellers.province` | `province` | nullable string max 255 | Seller profile |
| Postal code | `postal_code` | `Seller` | `sellers.postal_code` | `postal_code` | nullable string max 20 | Seller profile |
| Operating hours | `operating_hours` | `Seller` | `sellers.operating_hours` | `operating_hours` | nullable array | Seller profile |
| Store logo | `logo_path` | `Seller` | `sellers.logo_path` | `logo_file` / `logo_url` | image upload, stored in R2 | Seller branding |
| Store banner | `banner_path` | `Seller` | `sellers.banner_path` | `banner_file` / `banner_url` | image upload, stored in R2 | Seller branding |
| Return policy | `return_policy` | `Seller` | `sellers.return_policy` | `return_policy` | nullable string max 10000 | Seller profile |
| Shipping policy | `shipping_policy` | `Seller` | `sellers.shipping_policy` | `shipping_policy` | nullable string max 10000 | Seller profile |
| Privacy policy | `privacy_policy` | `Seller` | `sellers.privacy_policy` | `privacy_policy` | nullable string max 10000 | Seller profile |
| Categories | `categories()` via pivot | `Seller` / `Category` | `seller_categories` | `categories` | backend-authoritative relation | Seller specialization |

## Notes

- The page now uses the real seller profile endpoint and persists branding/policy changes through the same authenticated seller update flow.
- Partial updates preserve existing seller values when a field is not sent.
- Uploaded logo and banner files are stored in Cloudflare R2 through `MediaStorageService`.
