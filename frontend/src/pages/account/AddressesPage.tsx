import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { fetchAccountAddresses, removeAccountAddress, storeAccountAddress, updateAccountAddress, type BuyerAddress } from "../../api/buyer";
import PhilippineAddressSelector, { EMPTY_PHILIPPINE_ADDRESS, type PhilippineAddressValue } from "../../components/PhilippineAddressSelector";
import PhilippinePhoneField from "../../components/PhilippinePhoneField";
import { useAuth } from "../../auth/AuthContext";

type Draft = PhilippineAddressValue & { label: string; custom_label: string; recipient_name: string; phone: string; line1: string; line2: string; is_default: boolean };
const blank: Draft = { label: "Home", custom_label: "", recipient_name: "", phone: "", line1: "", line2: "", is_default: false, ...EMPTY_PHILIPPINE_ADDRESS };

function Field({ label, value, onChange, placeholder, error }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; error?: string }) {
  return <div><label className="mb-1.5 block text-xs font-[600] text-[var(--color-ink)]">{label}</label><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10" />{error && <p className="mt-1 text-xs text-[var(--color-red)]">{error}</p>}</div>;
}

function draftFrom(address: BuyerAddress): Draft {
  return { label: ["Home", "Work"].includes(address.label) ? address.label : "Other", custom_label: ["Home", "Work"].includes(address.label) ? "" : address.label, recipient_name: address.recipient_name, phone: address.phone, line1: address.line1, line2: address.line2 ?? "", is_default: address.is_default, region: address.region ?? "", region_code: address.region_code ?? "", province: address.province ?? "", province_code: address.province_code ?? "", city: address.city, city_code: address.city_code ?? "", barangay: address.barangay ?? "", barangay_code: address.barangay_code ?? "", postal_code: address.postal_code };
}

function formatted(address: BuyerAddress): string[] {
  return [address.line1, address.line2, address.barangay, [address.city, address.province, address.postal_code].filter(Boolean).join(", "), address.region, "Philippines"].filter((line): line is string => Boolean(line));
}

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [modal, setModal] = useState<{ id: number | null; draft: Draft } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const refresh = async () => { const response = await fetchAccountAddresses(); setAddresses(response.data); };
  useEffect(() => { let active = true; void fetchAccountAddresses().then(response => { if (active) setAddresses(response.data); }).catch(err => { if (active) setError(err instanceof Error ? err.message : "Unable to load addresses."); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setModal(current => current ? { ...current, draft: { ...current.draft, [key]: value } } : null);
  const openNew = () => setModal({ id: null, draft: { ...blank, phone: user?.phone ?? user?.mobile ?? "", recipient_name: user?.name ?? "" } });

  const save = async () => {
    if (!modal || saving) return;
    setSaving(true); setError(null); setFieldErrors({});
    const payload = { label: modal.draft.label === "Other" ? modal.draft.custom_label.trim() : modal.draft.label, recipient_name: modal.draft.recipient_name, phone: modal.draft.phone, line1: modal.draft.line1, line2: modal.draft.line2 || null, region_code: modal.draft.region_code, province_code: modal.draft.province_code || null, city_code: modal.draft.city_code, barangay_code: modal.draft.barangay_code, postal_code: modal.draft.postal_code, is_default: modal.draft.is_default };
    try {
      const response = modal.id ? await updateAccountAddress(modal.id, payload) : await storeAccountAddress(payload);
      setAddresses(current => [...current.filter(item => item.id !== response.data.id).map(item => response.data.is_default ? { ...item, is_default: false } : item), response.data]);
      setModal(null);
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(err.errors);
      setError(err instanceof Error ? err.message : "Unable to save address.");
    } finally { setSaving(false); }
  };

  const remove = async (id: number) => { if (saving) return; setSaving(true); try { await removeAccountAddress(id); await refresh(); } catch (err) { setError(err instanceof Error ? err.message : "Unable to remove address."); } finally { setSaving(false); } };
  const makeDefault = async (id: number) => { if (saving) return; setSaving(true); try { const response = await updateAccountAddress(id, { is_default: true }); setAddresses(current => current.map(item => item.id === id ? response.data : { ...item, is_default: false })); } catch (err) { setError(err instanceof Error ? err.message : "Unable to set the default address."); } finally { setSaving(false); } };

  if (loading) return <div className="p-6 text-sm text-[var(--color-ink-muted)]">Loading addresses...</div>;
  return <div className="min-h-full bg-[var(--color-ground)]"><div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12">
    <div className="mb-6 flex items-center justify-between"><div><h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">Saved Addresses</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">{addresses.length} saved address{addresses.length === 1 ? "" : "es"}</p></div><button onClick={openNew} className="rounded-sm bg-[var(--color-navy)] px-4 py-2.5 text-sm font-[500] text-white">Add address</button></div>
    {error && <div role="alert" className="mb-4 border border-[var(--color-red)]/30 bg-red-50 p-3 text-sm text-[var(--color-red)]">{error}</div>}
    {addresses.length === 0 ? <div className="border border-dashed border-[var(--color-border)] bg-white p-10 text-center text-sm text-[var(--color-ink-muted)]">Add your first shipping address to speed up checkout.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{addresses.map(address => <article key={address.id} className={`rounded-sm border bg-white p-5 ${address.is_default ? "border-[var(--color-navy)]" : "border-[var(--color-border)]"}`}><div className="mb-3 flex gap-2"><span className="rounded-sm border px-2 py-0.5 text-[10px]">{address.label}</span>{address.is_default && <span className="rounded-sm bg-[var(--color-navy)] px-2 py-0.5 text-[10px] text-white">Default</span>}</div><p className="text-sm font-[600]">{address.recipient_name}</p>{formatted(address).map((line, index) => <p key={`${line}-${index}`} className="text-sm text-[var(--color-ink-muted)]">{line}</p>)}<p className="mt-1 text-sm text-[var(--color-ink-muted)]">{address.phone}</p><div className="mt-4 flex gap-3 border-t pt-3 text-xs"><button onClick={() => { setFieldErrors({}); setModal({ id: address.id, draft: draftFrom(address) }); }} className="text-[var(--color-navy)]">Edit</button>{!address.is_default && <button disabled={saving} onClick={() => void makeDefault(address.id)}>Set default</button>}<button disabled={saving} onClick={() => void remove(address.id)} className="text-[var(--color-red)]">Delete</button></div></article>)}</div>}
  </div>
  {modal && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:px-4"><div role="dialog" aria-modal="true" aria-labelledby="address-modal-title" className="max-h-[94vh] w-full overflow-y-auto rounded-t-sm bg-white shadow-xl sm:max-w-2xl sm:rounded-sm"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4"><div><h2 id="address-modal-title" className="font-[var(--font-display)] text-xl">{modal.id ? "Edit address" : "Add new address"}</h2><p className="text-xs text-[var(--color-ink-muted)]">Philippine shipping information</p></div><button aria-label="Close address modal" onClick={() => setModal(null)} className="h-10 w-10 text-xl">×</button></header>
    <div className="space-y-6 px-5 py-5"><section><h3 className="mb-3 text-xs font-[700] uppercase tracking-wide text-[var(--color-ink-muted)]">Contact information</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Recipient name" value={modal.draft.recipient_name} onChange={value => update("recipient_name", value)} error={fieldErrors.recipient_name?.[0]} /><PhilippinePhoneField value={modal.draft.phone} onChange={value => update("phone", value)} error={fieldErrors.phone?.[0]} disabled={saving} /></div></section>
    <section><h3 className="mb-3 text-xs font-[700] uppercase tracking-wide text-[var(--color-ink-muted)]">Location</h3>{modal.id && !modal.draft.region_code && <p className="mb-3 rounded-sm bg-amber-50 p-3 text-xs text-amber-800">This legacy address needs its location reselected before saving.</p>}<PhilippineAddressSelector value={modal.draft} onChange={location => setModal(current => current ? { ...current, draft: { ...current.draft, ...location } } : null)} errors={fieldErrors} disabled={saving} /><div className="mt-3"><Field label="Postal code" value={modal.draft.postal_code} onChange={value => update("postal_code", value.replace(/\D/g, "").slice(0, 4))} placeholder="4-digit postal code" error={fieldErrors.postal_code?.[0]} /></div></section>
    <section><h3 className="mb-3 text-xs font-[700] uppercase tracking-wide text-[var(--color-ink-muted)]">Detailed address</h3><div className="space-y-3"><Field label="House / Unit / Building / Street" value={modal.draft.line1} onChange={value => update("line1", value)} error={fieldErrors.line1?.[0]} /><Field label="Subdivision / Village / Landmark" value={modal.draft.line2} onChange={value => update("line2", value)} /></div></section>
    <section><h3 className="mb-3 text-xs font-[700] uppercase tracking-wide text-[var(--color-ink-muted)]">Address label</h3><div className="flex flex-wrap gap-2">{["Home", "Work", "Other"].map(label => <button type="button" key={label} onClick={() => update("label", label)} className={`rounded-sm border px-4 py-2 text-sm ${modal.draft.label === label ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-white" : "border-[var(--color-border)]"}`}>{label}</button>)}</div>{modal.draft.label === "Other" && <div className="mt-3"><Field label="Custom label" value={modal.draft.custom_label} onChange={value => update("custom_label", value)} placeholder="Parents' House" error={fieldErrors.label?.[0]} /></div>}<label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={modal.draft.is_default} onChange={event => update("is_default", event.target.checked)} /> Set as default address</label></section></div>
    <footer className="sticky bottom-0 flex gap-3 border-t bg-white px-5 py-4"><button onClick={() => setModal(null)} className="flex-1 rounded-sm border py-2.5 text-sm">Cancel</button><button onClick={() => void save()} disabled={saving || !modal.draft.recipient_name || !modal.draft.phone || !modal.draft.line1 || !modal.draft.region_code || !modal.draft.city_code || !modal.draft.barangay_code || !modal.draft.postal_code || (modal.draft.label === "Other" && !modal.draft.custom_label.trim())} className="flex-1 rounded-sm bg-[var(--color-navy)] py-2.5 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : "Save address"}</button></footer>
  </div></div>}
  </div>;
}
