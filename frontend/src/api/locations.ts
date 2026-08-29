import { apiFetch } from "./client";

export type LocationOption = { code: string; name: string; postal_code?: string };

const requests = new Map<string, Promise<LocationOption[]>>();

function load(path: string): Promise<LocationOption[]> {
  const existing = requests.get(path);
  if (existing) return existing;
  const request = apiFetch<{ data: LocationOption[] }>(path)
    .then(response => response.data)
    .catch(error => { requests.delete(path); throw error; });
  requests.set(path, request);
  return request;
}

export const fetchRegions = () => load("/locations/regions");
export const fetchProvinces = (regionCode: string) => load(`/locations/regions/${encodeURIComponent(regionCode)}/provinces`);
export const fetchRegionCities = (regionCode: string) => load(`/locations/regions/${encodeURIComponent(regionCode)}/cities-municipalities`);
export const fetchProvinceCities = (provinceCode: string) => load(`/locations/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`);
export const fetchBarangays = (cityCode: string) => load(`/locations/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`);
