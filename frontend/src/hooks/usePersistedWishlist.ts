import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/ToastProvider";
import { useWishlist } from "../wishlist/WishlistContext";

export function usePersistedWishlist(productId: number, productName: string, onRequireLogin: () => void) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const wishlist = useWishlist();
  const wished = wishlist.isWished(productId);
  const busy = wishlist.isBusy(productId);

  const toggle = async () => {
    if (!user) {
      onRequireLogin();
      return;
    }

    try {
      const next = await wishlist.toggle(productId);
      if (!next) {
        showToast({ kind: "wishlist", title: "Removed from wishlist", message: `${productName} was removed.` });
      } else {
        showToast({ kind: "wishlist", title: "Saved to wishlist", message: `${productName} was saved successfully.` });
      }
    } catch (error) {
      showToast({
        kind: "error",
        title: "Could not update wishlist",
        error,
        errorContext: "product",
        fallbackMessage: "Unable to update your wishlist. Please try again.",
      });
    }
  };

  return { wished, busy, toggle };
}
