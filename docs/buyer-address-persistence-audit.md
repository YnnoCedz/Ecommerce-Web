# Buyer Address Persistence Audit

Date: 2026-08-20

| Action | Status | Verification |
| --- | --- | --- |
| List own addresses | LIVE | `GET /api/account/addresses` uses the authenticated user's relationship. |
| Add address | LIVE | `POST /api/account/addresses` validates and persists the row. The first address becomes default. |
| Edit address | LIVE | `PATCH /api/account/addresses/{addressId}` updates only an address owned by the authenticated user. |
| Delete address | LIVE | `DELETE /api/account/addresses/{addressId}` soft-deletes only an owned address. |
| Set default | LIVE | The update transaction unsets other defaults for the same user. |
| Default after deletion | LIVE | Deleting the default promotes the newest remaining owned address. |
| Checkout selection | LIVE | Saved addresses are loaded; an existing default is preselected. No arbitrary first address is silently selected. |
| Add from checkout | LIVE | The inline form calls the shared address API and selects the returned database record. |
| Cross-user access | BLOCKED | User-scoped update/delete and checkout lookup return 404 or validation failure for another user's ID. |
| Order snapshot | LIVE | Recipient, phone, lines, city, province, and postal code are copied into the order transaction. |

## Validation

- Recipient, label, street, city, province, and postal code are required.
- Phone accepts normalized `09XXXXXXXXX` or `+639XXXXXXXXX` Philippine mobile formats.
- Postal code must contain exactly four digits.
- Field lengths are bounded server-side.

## Known Limitation

The current frontend location mapping covers only the locations already present in the project. Complete PSGC hierarchy/codes remain a separate data-source task; no unsupported location records were fabricated.
