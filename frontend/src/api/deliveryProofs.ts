import { apiDownload, apiFetch } from "./client";

export type DeliveryProofMetadata = {
  exists: boolean;
  submitted_at?: string | null;
  note?: string | null;
  courier_name?: string | null;
};

export function fetchDeliveryProof(shipmentId: number) {
  return apiFetch<{
    data: {
      id: number;
      shipment_id: number;
      submitted_at: string | null;
      note: string | null;
      image_url: string;
    };
  }>(`/shipments/${shipmentId}/proof-of-delivery`);
}

export function downloadDeliveryProof(shipmentId: number) {
  return apiDownload(`/shipments/${shipmentId}/proof-of-delivery/content`);
}
