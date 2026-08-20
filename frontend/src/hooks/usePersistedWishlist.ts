import { useEffect, useState } from "react";
import { addWishlistItem, fetchWishlistStatus, removeWishlistItem } from "../api/buyer";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastProvider";

export function usePersistedWishlist(productId: number, productName: string, onRequireLogin: () => void) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wished, setWished] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      setWished(false);
      return;
    }

    let active = true;
    void fetchWishlistStatus(productId)
      .then((response) => {
        if (active) setWished(response.data.wishlisted);
      })
      .catch(() => {
        if (active) setWished(false);
      });

    return () => {
      active = false;
    };
  }, [productId, user]);

  const toggle = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }

    setBusy(true);
    try {
      if (wished) {
        await removeWishlistItem(productId);
        setWished(false);
        showToast({ kind: "wishlist", title: "Removed from wishlist", message: `${productName} was removed.` });
      } else {
        await addWishlistItem(productId);
        setWished(true);
        showToast({ kind: "wishlist", title: "Saved to wishlist", message: `${productName} was saved successfully.` });
      }
    } catch (error) {
      showToast({
        kind: "error",
        title: "Could not update wishlist",
        message: error instanceof Error ? error.message : "Unable to update your wishlist.",
      });
    } finally {
      setBusy(false);
    }
  };

  return { wished, busy, toggle };
}
