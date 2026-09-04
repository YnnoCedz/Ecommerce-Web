import { useEffect, useState } from "react";
import { Image, LoaderCircle, X } from "lucide-react";
import {
  downloadDeliveryProof,
  fetchDeliveryProof,
  type DeliveryProofMetadata,
} from "../../api/deliveryProofs";

export default function DeliveryProofViewer({
  shipmentId,
  proof,
  showCourier = false,
}: {
  shipmentId: number | null;
  proof: DeliveryProofMetadata;
  showCourier?: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
  }, [imageUrl]);

  if (!proof.exists || !shipmentId) return null;

  const view = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetchDeliveryProof(shipmentId);
      const image = await downloadDeliveryProof(shipmentId);
      setImageUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(image.blob);
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the proof image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-xs font-[600] text-[var(--color-ink)]">Proof of Delivery</p>
      {showCourier && proof.courier_name && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Submitted by {proof.courier_name}</p>}
      {proof.submitted_at && <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Submitted {new Date(proof.submitted_at).toLocaleString()}</p>}
      {proof.note && <p className="mt-2 text-sm text-[var(--color-ink-secondary)]">{proof.note}</p>}
      <button type="button" onClick={() => void view()} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-sm border border-[var(--color-navy)] px-3 py-2 text-xs font-[500] text-[var(--color-navy)] disabled:opacity-50">
        {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Image size={14} />}
        View Proof
      </button>
      {error && <p className="mt-2 text-xs text-[var(--color-red)]" role="alert">{error}</p>}
      {imageUrl && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Proof of delivery image">
          <div className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-sm bg-white p-3 shadow-xl">
            <button type="button" onClick={() => setImageUrl(null)} className="absolute right-4 top-4 rounded-full bg-white p-2 shadow" aria-label="Close proof image"><X size={18} /></button>
            <img src={imageUrl} alt="Proof of delivery" className="max-h-[82vh] max-w-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
