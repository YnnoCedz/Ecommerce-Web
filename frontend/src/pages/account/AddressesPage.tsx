import { useEffect, useMemo, useState } from "react";
import { fetchAccountAddresses, removeAccountAddress, storeAccountAddress, updateAccountAddress, type BuyerAddress } from "../../api/buyer";

type LocationOption = { name: string; postal: string };

const ADDRESS_LOCATIONS: Record<string, LocationOption[]> = {
  "Metro Manila": [
    { name: "Quezon City", postal: "1100" },
    { name: "Manila", postal: "1000" },
    { name: "Makati", postal: "1200" },
    { name: "Pasig", postal: "1600" },
    { name: "Taguig", postal: "1630" },
  ],
  Cebu: [
    { name: "Cebu City", postal: "6000" },
    { name: "Mandaue City", postal: "6014" },
    { name: "Lapu-Lapu City", postal: "6015" },
  ],
  Cavite: [
    { name: "Bacoor", postal: "4102" },
    { name: "Imus", postal: "4103" },
    { name: "Dasmariñas", postal: "4114" },
  ],
  Laguna: [
    { name: "Santa Rosa", postal: "4026" },
    { name: "Calamba", postal: "4027" },
    { name: "Biñan", postal: "4024" },
  ],
};

const ADDRESS_REGIONS = Object.keys(ADDRESS_LOCATIONS);
const LABELS = ["Home", "Office", "Other"];

type AddressDraft = {
  label: string;
  recipient_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
};

const BLANK_ADDRESS: AddressDraft = {
  label: "Home",
  recipient_name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postal_code: "",
  is_default: false,
};

function mapAddress(address: BuyerAddress) {
  return {
    id: address.id,
    label: address.label,
    name: address.recipient_name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    province: address.province,
    postal: address.postal_code,
    isDefault: address.is_default,
  };
}

function Field({ label, value, onChange, placeholder, readOnly = false, disabled = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; readOnly?: boolean; disabled?: boolean; }) {
  return (
    <div>
      <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 text-sm border border-[var(--color-border)] rounded-sm bg-white text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 transition-all disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-disabled)]"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, disabled = false }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; disabled?: boolean; }) {
  return (
    <div>
      <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3.5 py-2.5 text-sm border border-[var(--color-border)] rounded-sm bg-white text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 cursor-pointer transition-all disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-disabled)]"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<ReturnType<typeof mapAddress>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ id: number | null; draft: AddressDraft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchAccountAddresses();
        if (!active) return;
        setAddresses(response.data.map(mapAddress));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load addresses.");
        setAddresses([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const selectedCityOptions = useMemo(() => modal?.draft.province ? ADDRESS_LOCATIONS[modal.draft.province] ?? [] : [], [modal?.draft.province]);

  const openAdd = () => setModal({ id: null, draft: { ...BLANK_ADDRESS } });
  const openEdit = (address: ReturnType<typeof mapAddress>) => setModal({
    id: address.id,
    draft: {
      label: address.label,
      recipient_name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      province: address.province,
      postal_code: address.postal,
      is_default: address.isDefault,
    },
  });
  const updateDraft = (key: keyof AddressDraft) => (value: string | boolean) => {
    setModal((current) => {
      if (!current) return null;
      if (key === "province" && typeof value === "string") {
        return { ...current, draft: { ...current.draft, province: value, city: "", postal_code: "" } };
      }
      if (key === "city" && typeof value === "string") {
        const postal_code = (ADDRESS_LOCATIONS[current.draft.province] ?? []).find(loc => loc.name === value)?.postal ?? "";
        return { ...current, draft: { ...current.draft, city: value, postal_code } };
      }
      return { ...current, draft: { ...current.draft, [key]: value } };
    });
  };

  const save = async () => {
    if (!modal) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...modal.draft,
        line2: modal.draft.line2 || null,
      };
      const response = modal.id
        ? await updateAccountAddress(modal.id, payload)
        : await storeAccountAddress(payload);

      setAddresses((current) => {
        const next = current
          .filter((address) => address.id !== response.data.id)
          .map((address) => response.data.is_default ? { ...address, isDefault: false } : address);
        return [...next, mapAddress(response.data)];
      });
      setModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save address.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (addressId: number) => {
    setSaving(true);
    setError(null);
    try {
      await removeAccountAddress(addressId);
      const response = await fetchAccountAddresses();
      setAddresses(response.data.map(mapAddress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove address.");
    } finally {
      setSaving(false);
    }
  };

  const makeDefault = async (address: ReturnType<typeof mapAddress>) => {
    setSaving(true);
    setError(null);
    try {
      const response = await updateAccountAddress(address.id, {
        label: address.label,
        recipient_name: address.name,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2 || null,
        city: address.city,
        province: address.province,
        postal_code: address.postal,
        is_default: true,
      });
      setAddresses((current) => current.map((entry) => entry.id === address.id ? mapAddress(response.data) : { ...entry, isDefault: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to set the default address.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-[var(--color-ground)] min-h-full p-6 max-w-screen-xl mx-auto text-sm text-[var(--color-ink-muted)]">Loading addresses...</div>;
  }

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Saved Addresses</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{addresses.length} address{addresses.length === 1 ? "" : "es"} loaded from the backend</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
            Add address
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-[var(--color-red-light)] border border-[var(--color-red-border)] text-[var(--color-red)] text-sm rounded-sm px-4 py-3">
            {error}
          </div>
        )}

        {addresses.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">No addresses yet</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-4">Add your first shipping address to speed up checkout.</p>
            <button onClick={openAdd} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">
              Add address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <div key={addr.id} className={`bg-white border rounded-sm p-5 ${addr.isDefault ? "border-[var(--color-navy)]" : "border-[var(--color-border)]"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    {addr.label}
                  </span>
                  {addr.isDefault && <span className="font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-navy)] text-white">Default</span>}
                </div>
                <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5">{addr.name}</p>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-0.5">{addr.line1}</p>
                {addr.line2 && <p className="text-sm text-[var(--color-ink-muted)]">{addr.line2}</p>}
                <p className="text-sm text-[var(--color-ink-muted)]">{addr.city}, {addr.province} {addr.postal}</p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{addr.phone}</p>
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                  <button type="button" onClick={() => openEdit(addr)} className="text-xs font-[500] text-[var(--color-navy)]">Edit</button>
                  {!addr.isDefault && <button type="button" onClick={() => void makeDefault(addr)} disabled={saving} className="text-xs font-[500] text-[var(--color-ink-muted)] disabled:opacity-50">Set default</button>}
                  <button type="button" onClick={() => void remove(addr.id)} disabled={saving} className="text-xs font-[500] text-[var(--color-red)] disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="bg-white rounded-t-sm sm:rounded-sm shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">{modal.id ? "Edit address" : "Add new address"}</h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <SelectField label="Address type" value={modal.draft.label} onChange={updateDraft("label")} options={LABELS} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name" value={modal.draft.recipient_name} onChange={updateDraft("recipient_name") as (v: string) => void} placeholder="Ana Reyes" />
                <Field label="Phone number" value={modal.draft.phone} onChange={updateDraft("phone") as (v: string) => void} placeholder="+63 9XX XXX XXXX" />
              </div>
              <Field label="Address line 1" value={modal.draft.line1} onChange={updateDraft("line1") as (v: string) => void} placeholder="Street / Building / House no." />
              <Field label="Address line 2 (optional)" value={modal.draft.line2} onChange={updateDraft("line2") as (v: string) => void} placeholder="Subdivision / Barangay" />
              <div className="grid grid-cols-2 gap-3">
                <SelectField label="Province / Region" value={modal.draft.province} onChange={updateDraft("province") as (v: string) => void} options={ADDRESS_REGIONS} placeholder="Select province / region" />
                <div>
                  <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">City / Municipality</label>
                  <select
                    value={modal.draft.city}
                    onChange={e => updateDraft("city")(e.target.value)}
                    disabled={!modal.draft.province}
                    className="w-full px-3.5 py-2.5 text-sm border border-[var(--color-border)] rounded-sm bg-white text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 cursor-pointer transition-all disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-disabled)]">
                    <option value="">{modal.draft.province ? "Select city / municipality" : "Select province first"}</option>
                    {selectedCityOptions.map(city => <option key={city.name} value={city.name}>{city.name}</option>)}
                  </select>
                </div>
              </div>
              <Field label="Postal code" value={modal.draft.postal_code} onChange={updateDraft("postal_code") as (v: string) => void} placeholder="Auto-filled" readOnly />
            </div>
            <div className="sticky bottom-0 bg-white flex gap-3 px-6 py-4 border-t border-[var(--color-border)]">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer disabled:opacity-60">
                {saving ? "Saving..." : "Save address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
