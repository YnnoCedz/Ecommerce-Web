import { useEffect, useRef, useState } from "react";
import { fetchBarangays, fetchProvinceCities, fetchProvinces, fetchRegionCities, fetchRegions, type LocationOption } from "../api/locations";

export type PhilippineAddressValue = {
  region_code: string; region: string;
  province_code: string; province: string;
  city_code: string; city: string;
  barangay_code: string; barangay: string;
  postal_code: string;
};

export const EMPTY_PHILIPPINE_ADDRESS: PhilippineAddressValue = {
  region_code: "", region: "", province_code: "", province: "",
  city_code: "", city: "", barangay_code: "", barangay: "", postal_code: "",
};

type Props = {
  value: PhilippineAddressValue;
  onChange: (value: PhilippineAddressValue) => void;
  errors?: Record<string, string[]>;
  disabled?: boolean;
};

function LocationSelect({ label, value, options, loading, disabled, placeholder, error, onChange, retry }: {
  label: string; value: string; options: LocationOption[]; loading: boolean; disabled: boolean;
  placeholder: string; error?: string; onChange: (code: string) => void; retry: () => void;
}) {
  return <div>
    <label className="mb-1.5 block text-xs font-[600] text-[var(--color-ink)]">{label}</label>
    <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled || loading}
      className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 disabled:bg-[var(--color-surface)]">
      <option value="">{loading ? `Loading ${label.toLowerCase()}...` : placeholder}</option>
      {options.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
    </select>
    {error && <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-red)]"><span>{error}</span><button type="button" onClick={retry} className="font-[600] underline">Retry</button></div>}
  </div>;
}

export default function PhilippineAddressSelector({ value, onChange, errors = {}, disabled = false }: Props) {
  const [regions, setRegions] = useState<LocationOption[]>([]);
  const [provinces, setProvinces] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [barangays, setBarangays] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<Record<string, string>>({});
  const versions = useRef<Record<string, number>>({});

  const load = async (level: string, request: () => Promise<LocationOption[]>, apply: (items: LocationOption[]) => void) => {
    const current = (versions.current[level] ?? 0) + 1;
    versions.current[level] = current;
    setLoading(level); setLoadError(previous => ({ ...previous, [level]: "" }));
    try { const items = await request(); if (current === versions.current[level]) apply(items); }
    catch { if (current === versions.current[level]) setLoadError(previous => ({ ...previous, [level]: `Unable to load ${level}.` })); }
    finally { if (current === versions.current[level]) setLoading(previous => previous === level ? null : previous); }
  };

  useEffect(() => { void load("regions", fetchRegions, setRegions); }, []);

  useEffect(() => {
    if (!value.region_code) { setProvinces([]); return; }
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    void load("provinces", () => fetchProvinces(value.region_code), items => {
      setProvinces(items);
      if (items.length === 0) void load("cities", () => fetchRegionCities(value.region_code), setCities);
      else if (value.province_code) void load("cities", () => fetchProvinceCities(value.province_code), setCities);
    });
  }, [value.region_code]);

  useEffect(() => {
    if (!value.province_code) return;
    setCities([]);
    setBarangays([]);
    void load("cities", () => fetchProvinceCities(value.province_code), setCities);
  }, [value.province_code]);

  useEffect(() => {
    if (!value.city_code) { setBarangays([]); return; }
    setBarangays([]);
    void load("barangays", () => fetchBarangays(value.city_code), setBarangays);
  }, [value.city_code]);

  const choose = (level: "region" | "province" | "city" | "barangay", code: string) => {
    const options = level === "region" ? regions : level === "province" ? provinces : level === "city" ? cities : barangays;
    const selected = options.find(option => option.code === code);
    if (level === "region") onChange({ ...EMPTY_PHILIPPINE_ADDRESS, region_code: code, region: selected?.name ?? "" });
    if (level === "province") onChange({ ...value, province_code: code, province: selected?.name ?? "", city_code: "", city: "", barangay_code: "", barangay: "", postal_code: "" });
    if (level === "city") onChange({ ...value, city_code: code, city: selected?.name ?? "", barangay_code: "", barangay: "", postal_code: selected?.postal_code ?? "" });
    if (level === "barangay") onChange({ ...value, barangay_code: code, barangay: selected?.name ?? "", postal_code: selected?.postal_code || value.postal_code });
  };

  return <div className="grid gap-3 sm:grid-cols-2">
    <LocationSelect label="Region" value={value.region_code} options={regions} loading={loading === "regions"} disabled={disabled} placeholder="Select region" error={loadError.regions || errors.region_code?.[0]} onChange={code => choose("region", code)} retry={() => void load("regions", fetchRegions, setRegions)} />
    {provinces.length > 0 && <LocationSelect label="Province" value={value.province_code} options={provinces} loading={loading === "provinces"} disabled={disabled || !value.region_code} placeholder="Select province" error={loadError.provinces || errors.province_code?.[0]} onChange={code => choose("province", code)} retry={() => void load("provinces", () => fetchProvinces(value.region_code), setProvinces)} />}
    <LocationSelect label="City / Municipality" value={value.city_code} options={cities} loading={loading === "cities"} disabled={disabled || !value.region_code || (provinces.length > 0 && !value.province_code)} placeholder="Select city / municipality" error={loadError.cities || errors.city_code?.[0]} onChange={code => choose("city", code)} retry={() => void load("cities", () => value.province_code ? fetchProvinceCities(value.province_code) : fetchRegionCities(value.region_code), setCities)} />
    <LocationSelect label="Barangay" value={value.barangay_code} options={barangays} loading={loading === "barangays"} disabled={disabled || !value.city_code} placeholder="Select barangay" error={loadError.barangays || errors.barangay_code?.[0]} onChange={code => choose("barangay", code)} retry={() => void load("barangays", () => fetchBarangays(value.city_code), setBarangays)} />
  </div>;
}
