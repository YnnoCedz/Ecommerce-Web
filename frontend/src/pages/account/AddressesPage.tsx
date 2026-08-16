import { useMemo, useState } from "react";

type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postal: string;
  isDefault: boolean;
};

type LocationOption = { name: string; postal: string };

const INITIAL: Address[] = [
  {
    id: "a1",
    label: "Home",
    name: "Ana Reyes",
    phone: "+63 917 555 0182",
    line1: "24 Sampaguita Street, Brgy. San Antonio",
    line2: "Green Village Subdivision",
    city: "Quezon City",
    province: "Metro Manila",
    postal: "1100",
    isDefault: true,
  },
  {
    id: "a2",
    label: "Office",
    name: "Ana Reyes",
    phone: "+63 917 555 0182",
    line1: "32F Octagon Tower, Ayala Avenue",
    line2: "",
    city: "Makati",
    province: "Metro Manila",
    postal: "1226",
    isDefault: false,
  },
];

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
    { name: "Dasmarinas", postal: "4114" },
  ],
  Laguna: [
    { name: "Santa Rosa", postal: "4026" },
    { name: "Calamba", postal: "4027" },
    { name: "Binan", postal: "4024" },
  ],
  Rizal: [
    { name: "Antipolo", postal: "1870" },
    { name: "Cainta", postal: "1900" },
    { name: "Taytay", postal: "1920" },
  ],
  Bulacan: [
    { name: "Meycauayan", postal: "3020" },
    { name: "Malolos", postal: "3000" },
    { name: "San Jose del Monte", postal: "3023" },
  ],
  Pampanga: [
    { name: "San Fernando", postal: "2000" },
    { name: "Angeles", postal: "2009" },
    { name: "Mabalacat", postal: "2010" },
  ],
  "Davao del Sur": [
    { name: "Davao City", postal: "8000" },
    { name: "Digos", postal: "8002" },
  ],
};

const ADDRESS_REGIONS = Object.keys(ADDRESS_LOCATIONS);
const LABELS = ["Home", "Office", "Other"];

function Field({
  label,
  value,
  onChange,
  placeholder,
  readOnly = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
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

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
}) {
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
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

const BLANK_ADDRESS: Omit<Address, "id"> = {
  label: "Home",
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  province: "",
  postal: "",
  isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(INITIAL);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; draft: Omit<Address, "id">; editId?: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const openAdd = () => setModal({ mode: "add", draft: { ...BLANK_ADDRESS } });
  const openEdit = (addr: Address) => setModal({ mode: "edit", draft: { ...addr }, editId: addr.id });

  const save = () => {
    if (!modal) return;

    if (modal.mode === "add") {
      const newAddr: Address = {
        ...modal.draft,
        id: `a${Date.now()}`,
      };

      const list = modal.draft.isDefault
        ? addresses.map(a => ({ ...a, isDefault: false }))
        : addresses;

      setAddresses([...list, newAddr]);
    } else {
      setAddresses(
        addresses.map(a => {
          if (a.id === modal.editId) {
            return {
              ...modal.draft,
              id: a.id,
            };
          }

          if (modal.draft.isDefault) {
            return {
              ...a,
              isDefault: false,
            };
          }

          return a;
        })
      );
    }

    setModal(null);
  };

  const deleteAddr = (id: string) => {
    setAddresses(a => a.filter(x => x.id !== id));
    setConfirmDelete(null);
  };

  const setDefault = (id: string) =>
    setAddresses(a => a.map(x => ({ ...x, isDefault: x.id === id })));

  const updateDraft = (key: keyof Omit<Address, "id">) => (val: string | boolean) =>
    setModal(m => {
      if (!m) return null;
      if (key === "province" && typeof val === "string") {
        return { ...m, draft: { ...m.draft, province: val, city: "", postal: "" } };
      }
      if (key === "city" && typeof val === "string") {
        const postal = (ADDRESS_LOCATIONS[m.draft.province] ?? []).find(loc => loc.name === val)?.postal ?? "";
        return { ...m, draft: { ...m.draft, city: val, postal } };
      }
      return { ...m, draft: { ...m.draft, [key]: val } };
    });

  const selectedCityOptions = useMemo(() => {
    if (!modal?.draft.province) return [];
    return ADDRESS_LOCATIONS[modal.draft.province] ?? [];
  }, [modal?.draft.province]);

  return (
    <div className="bg-[var(--color-ground)] min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        <div className="flex items-center gap-2 mb-5">
          <button className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] cursor-pointer">Home</button>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-[var(--color-ink-disabled)]">
            <path d="M3 2l3 2.5-3 2.5" />
          </svg>
          <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">Addresses</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Saved Addresses</h1>
            <p className="text-sm text-[var(--color-ink-muted)] mt-1">{addresses.length} of 5 addresses saved</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors cursor-pointer"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 2v8M2 6h8" />
            </svg>
            Add address
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-sm p-16 text-center">
            <svg width="48" height="48" viewBox="0 0 18 18" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round" className="mx-auto mb-4">
              <path d="M9 2C6.2 2 4 4.2 4 7c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" />
              <circle cx="9" cy="7" r="1.5" />
            </svg>
            <p className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-1">No addresses yet</p>
            <p className="text-sm text-[var(--color-ink-muted)] mb-4">Add your first shipping address to speed up checkout.</p>
            <button onClick={openAdd} className="px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">
              Add address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <div key={addr.id} className={`bg-white border rounded-sm p-5 relative ${addr.isDefault ? "border-[var(--color-navy)]" : "border-[var(--color-border)]"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-muted)]">
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span className="font-[var(--font-mono)] text-[10px] font-[500] px-2 py-0.5 rounded-sm bg-[var(--color-navy)] text-white">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-[600] text-[var(--color-ink)] mb-0.5">{addr.name}</p>
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-0.5">{addr.line1}</p>
                {addr.line2 && <p className="text-sm text-[var(--color-ink-muted)]">{addr.line2}</p>}
                <p className="text-sm text-[var(--color-ink-muted)]">
                  {addr.city}, {addr.province} {addr.postal}
                </p>
                <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">{addr.phone}</p>

                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
                  <button onClick={() => openEdit(addr)} className="text-xs font-[500] text-[var(--color-navy)] hover:underline cursor-pointer">Edit</button>
                  {!addr.isDefault && (
                    <>
                      <span className="text-[var(--color-border-strong)]">·</span>
                      <button onClick={() => setDefault(addr.id)} className="text-xs font-[500] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] hover:underline cursor-pointer">Set as default</button>
                    </>
                  )}
                  <span className="text-[var(--color-border-strong)]">·</span>
                  <button onClick={() => setConfirmDelete(addr.id)} className="text-xs font-[500] text-[var(--color-red)] hover:underline cursor-pointer">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-sm shadow-xl max-w-sm w-full p-6">
            <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)] mb-2">Delete address?</h3>
            <p className="text-sm text-[var(--color-ink-muted)] mb-5 leading-relaxed">This address will be permanently removed from your account.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
              <button onClick={() => deleteAddr(confirmDelete)} className="flex-1 py-2.5 bg-[var(--color-red)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-red-hover)] cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="bg-white rounded-t-sm sm:rounded-sm shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
              <h3 className="font-[var(--font-display)] text-lg font-[400] text-[var(--color-ink)]">
                {modal.mode === "add" ? "Add new address" : "Edit address"}
              </h3>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M2 2l10 10M12 2L2 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <SelectField label="Address type" value={modal.draft.label} onChange={updateDraft("label")} options={LABELS} />

              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name" value={modal.draft.name} onChange={updateDraft("name") as (v: string) => void} placeholder="Ana Reyes" />
                <Field label="Phone number" value={modal.draft.phone} onChange={updateDraft("phone") as (v: string) => void} placeholder="+63 9XX XXX XXXX" />
              </div>
              <Field label="Address line 1" value={modal.draft.line1} onChange={updateDraft("line1") as (v: string) => void} placeholder="Street / Building / House no." />
              <Field label="Address line 2 (optional)" value={modal.draft.line2} onChange={updateDraft("line2") as (v: string) => void} placeholder="Subdivision / Barangay" />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Province / Region"
                  value={modal.draft.province}
                  onChange={updateDraft("province") as (v: string) => void}
                  options={ADDRESS_REGIONS}
                  placeholder="Select province / region"
                />
                <div>
                  <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">City / Municipality</label>
                  <select
                    value={modal.draft.city}
                    onChange={e => updateDraft("city")(e.target.value)}
                    disabled={!modal.draft.province}
                    className="w-full px-3.5 py-2.5 text-sm border border-[var(--color-border)] rounded-sm bg-white text-[var(--color-ink)] outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10 cursor-pointer transition-all disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-disabled)]"
                  >
                    <option value="">{modal.draft.province ? "Select city / municipality" : "Select province first"}</option>
                    {selectedCityOptions.map(city => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label="Postal code" value={modal.draft.postal} onChange={updateDraft("postal") as (v: string) => void} placeholder="Auto-filled" readOnly />

              <label className="flex items-center gap-3 cursor-pointer py-2">
                <button
                  onClick={() => updateDraft("isDefault")(!modal.draft.isDefault)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${modal.draft.isDefault ? "bg-[var(--color-navy)]" : "bg-[var(--color-border-strong)]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${modal.draft.isDefault ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-sm text-[var(--color-ink)]">Set as default shipping address</span>
              </label>
            </div>
            <div className="sticky bottom-0 bg-white flex gap-3 px-6 py-4 border-t border-[var(--color-border)]">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer">Cancel</button>
              <button onClick={save} className="flex-1 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer">
                {modal.mode === "add" ? "Save address" : "Update address"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
