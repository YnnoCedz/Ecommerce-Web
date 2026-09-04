<?php

namespace App\Services;

use App\Models\User;

/**
 * Phase 2.6 - the single authoritative source for "what may this identity do?".
 *
 * Capabilities are DERIVED from the existing relationships on every read. They are
 * deliberately never stored as `users.is_buyer` / `is_seller` / `is_rider` /
 * `is_logistics` columns: rider capability depends on five columns across three
 * tables and logistics capability on four across two, so a stored projection would
 * silently go stale exactly when it matters - at an access check. Suspending a
 * logistics provider must revoke its staff on the very next request, which only
 * derivation guarantees.
 *
 * Results are memoised per resolver instance (request-scoped singleton) and never
 * cached across requests.
 */
class CapabilityResolver
{
    /**
     * @return array{buyer: bool, seller: bool, rider: bool, logistics: bool, admin: bool}
     */
    public function for(User $user): array
    {
        return [
            'buyer' => $this->buyer($user),
            'seller' => $this->seller($user),
            'rider' => $this->rider($user),
            'logistics' => $this->logistics($user),
            'admin' => $this->admin($user),
        ];
    }

    /**
     * Marketplace / Buyer access is authoritative only on an approved
     * marketplace profile. A users row or bearer token proves identity, not
     * permission to shop.
     */
    public function buyer(User $user): bool
    {
        if (! $user->isAccountEligible() || $this->admin($user)) {
            return false;
        }

        if (! $user->relationLoaded('marketplaceProfile')) {
            $user->setRelation('marketplaceProfile', $user->marketplaceProfile()->first());
        }

        return $user->marketplaceProfile?->status === 'approved';
    }

    /**
     * Seller Center. Phase 2.6 decouples this from `users.role === 'seller'`
     * (D-10). The approved seller profile is now the only authority; a legacy
     * `role = 'seller'` value is tolerated but never consulted.
     */
    public function seller(User $user): bool
    {
        if (! $this->buyer($user)) {
            return false;
        }

        return $user->resolveSellerProfile()?->status === 'approved';
    }

    /**
     * Rider is independent of Buyer and requires the active provider
     * affiliation created by provider-owned approval.
     */
    public function rider(User $user): bool
    {
        if (! $user->isAccountEligible()) {
            return false;
        }

        return $user->hasActiveCourierProfile();
    }

    /**
     * Logistics staff. Reuses the Phase 2 rule unchanged: active staff record
     * with an approved active provider.
     */
    public function logistics(User $user): bool
    {
        if (! $user->isAccountEligible()) {
            return false;
        }

        return $user->hasActiveLogisticsStaffProfile();
    }

    /**
     * Admin stays platform authority on `users.role` (D-13 of the audit / rule 13).
     * It is not a marketplace capability and is not derived from a relationship.
     */
    public function admin(User $user): bool
    {
        return $user->role === 'admin';
    }
}
