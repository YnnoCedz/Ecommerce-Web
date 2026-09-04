import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { addWishlistItem, fetchWishlistItems, removeWishlistItem } from "../api/buyer";
import { useAuth } from "../auth/AuthContext";
import { isMarketplaceShopper } from "../auth/capabilities";

type WishlistContextValue = {
  count: number;
  isWished: (productId: number) => boolean;
  isBusy: (productId: number) => boolean;
  toggle: (productId: number) => Promise<boolean>;
  remove: (productId: number) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [ids, setIds] = useState<Set<number>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set());
  const busyIdsRef = useRef(new Set<number>());

  useEffect(() => {
    if (authLoading) return;
    if (!isMarketplaceShopper(user)) { busyIdsRef.current.clear(); setIds(new Set()); setBusyIds(new Set()); return; }
    let active = true;
    void fetchWishlistItems().then(response => { if (active) setIds(new Set(response.data.map(item => item.product_id))); }).catch(() => { if (active) setIds(new Set()); });
    return () => { active = false; };
  }, [authLoading, user?.id, user?.role]);

  const toggle = useCallback(async (productId: number) => {
    if (!isMarketplaceShopper(user) || busyIdsRef.current.has(productId)) return ids.has(productId);
    const previous = ids.has(productId);
    busyIdsRef.current.add(productId);
    setBusyIds(current => new Set(current).add(productId));
    setIds(current => { const next = new Set(current); previous ? next.delete(productId) : next.add(productId); return next; });
    try {
      if (previous) await removeWishlistItem(productId); else await addWishlistItem(productId);
      return !previous;
    } catch (error) {
      setIds(current => { const next = new Set(current); previous ? next.add(productId) : next.delete(productId); return next; });
      throw error;
    } finally {
      busyIdsRef.current.delete(productId);
      setBusyIds(current => { const next = new Set(current); next.delete(productId); return next; });
    }
  }, [ids, user]);

  const remove = useCallback(async (productId: number) => { if (ids.has(productId)) await toggle(productId); }, [ids, toggle]);
  const value = useMemo(() => ({ count: ids.size, isWished: (id: number) => ids.has(id), isBusy: (id: number) => busyIds.has(id), toggle, remove }), [busyIds, ids, remove, toggle]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used inside WishlistProvider.");
  return context;
}
