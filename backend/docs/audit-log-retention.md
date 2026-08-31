# Audit log retention

Maketo activity logs deliberately exclude credentials, authentication tokens, verification codes, MFA secrets, and private document contents.

Security, administrator, seller-state, document-review, and platform-setting events should be retained for at least 365 days. Events tied to orders, disputes, payouts, account closure, or regulatory evidence should follow the longer financial-record retention policy once that policy is formally approved.

No automatic deletion job is enabled by this change. Before pruning is introduced, the owner must approve the retention periods, legal holds, export/archive destination, and deletion audit trail. Routine analytics should query bounded date ranges and indexed columns rather than loading the complete history.
