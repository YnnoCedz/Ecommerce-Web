import { useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSellerProfile,
  fetchSellerProducts,
  updateSellerProfile,
  type SellerProduct,
  type SellerProfile,
} from "../../api/seller";

type StoreTab = "profile" | "branding" | "policies" | "preview";

const INPUT =
  "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5";
const EMPTY_HINT = "text-sm text-[var(--color-ink-muted)]";

function SectionCard({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-sm mb-5">
      <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function EmptyPanel({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-5 text-center">
      <p className="text-sm font-[500] text-[var(--color-ink)]">{title}</p>
      <p className="text-xs text-[var(--color-ink-muted)] mt-1">{subtitle}</p>
    </div>
  );
}

function formatHours(hours: Array<{ day?: string | null; hours?: string | null }> | undefined | null) {
  if (!hours?.length) {
    return [];
  }

  return hours.map((item) => ({
    day: item.day ?? "",
    hours: item.hours ?? "",
  }));
}

function ProfileTab({
  profile,
  onUpdated,
}: {
  profile: SellerProfile | null;
  onUpdated: (profile: SellerProfile) => void;
}) {
  const [businessName, setBusinessName] = useState(profile?.business_name ?? "");
  const [tagline, setTagline] = useState(profile?.tagline ?? "");
  const [description, setDescription] = useState(profile?.description ?? "");
  const [publicEmail, setPublicEmail] = useState(profile?.public_email ?? profile?.contact_email ?? "");
  const [publicPhone, setPublicPhone] = useState(profile?.messaging_phone ?? profile?.contact_phone ?? "");
  const [addressLine1, setAddressLine1] = useState(profile?.address_line1 ?? "");
  const [addressLine2, setAddressLine2] = useState(profile?.address_line2 ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [province, setProvince] = useState(profile?.province ?? "");
  const [postalCode, setPostalCode] = useState(profile?.postal_code ?? "");
  const [hours, setHours] = useState<Array<{ day: string; hours: string }>>(formatHours(profile?.operating_hours));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setBusinessName(profile?.business_name ?? "");
    setTagline(profile?.tagline ?? "");
    setDescription(profile?.description ?? "");
    setPublicEmail(profile?.public_email ?? profile?.contact_email ?? "");
    setPublicPhone(profile?.messaging_phone ?? profile?.contact_phone ?? "");
    setAddressLine1(profile?.address_line1 ?? "");
    setAddressLine2(profile?.address_line2 ?? "");
    setCity(profile?.city ?? "");
    setProvince(profile?.province ?? "");
    setPostalCode(profile?.postal_code ?? "");
    setHours(formatHours(profile?.operating_hours));
  }, [profile]);

  const categoryChips = profile?.categories ?? [];

  const addressPreview = [addressLine1, addressLine2, city, province, postalCode].filter(Boolean).join(", ");

  const handleSave = async () => {
    if (!profile || saving) {
      return;
    }

    if (!businessName.trim()) {
      setNotice("Store name is required before saving.");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await updateSellerProfile({
        business_name: businessName,
        trade_name: profile.trade_name,
        tagline: tagline || null,
        description: description || null,
        contact_email: profile.contact_email,
        public_email: publicEmail || null,
        contact_phone: profile.contact_phone,
        messaging_phone: publicPhone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        province: province || null,
        city: city || null,
        postal_code: postalCode || null,
        payout_method: profile.payout_method,
        payout_schedule: profile.payout_schedule,
        bank_name: profile.bank_name,
        account_type: profile.account_type,
        bank_account_number: profile.bank_account_number,
        gcash_number: profile.gcash_number,
        maya_number: profile.maya_number,
        account_name: profile.account_name,
        operating_hours: hours.filter((item) => item.day || item.hours),
      });

      setNotice(response.message);
      onUpdated(response.data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save store profile right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionCard title="Store identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>
              Store name <span className="text-[var(--color-red)]">*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className={INPUT}
              placeholder="Store name"
            />
          </div>
          <div>
            <label className={LABEL}>
              Store URL slug <span className="text-[var(--color-red)]">*</span>
            </label>
            <div className="flex items-center border border-[var(--color-border)] rounded-sm bg-white focus-within:border-[var(--color-navy)] overflow-hidden">
              <span className="px-3 py-2.5 text-xs text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border-r border-[var(--color-border)] whitespace-nowrap">
                marketo.ph/store/
              </span>
              <input
                type="text"
                value={profile?.slug ?? ""}
                readOnly
                className="flex-1 px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none bg-white font-[var(--font-body)]"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL}>Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(event) => setTagline(event.target.value)}
            className={INPUT}
            maxLength={80}
            placeholder="Short brand line"
          />
        </div>

        <div>
          <label className={LABEL}>Store description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={INPUT + " resize-none"}
            maxLength={1000}
            placeholder="Tell buyers about your store..."
          />
          <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Shown on your public store page. Max 1000 characters.</p>
        </div>
      </SectionCard>

      <SectionCard
        title="Categories & specializations"
        subtitle="Selected categories come from the backend seller profile."
        action={<button type="button" disabled className="px-3 py-1.5 border border-dashed border-[var(--color-border)] text-xs text-[var(--color-ink-disabled)] rounded-sm cursor-not-allowed">+ Add category</button>}
      >
        <div className="flex flex-wrap items-center gap-2">
          {categoryChips.length > 0 ? (
            categoryChips.map((category) => (
              <span
                key={category.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-navy-surface)] text-[var(--color-navy)] text-xs rounded border border-[var(--color-navy)]/20"
              >
                {category.name}
              </span>
            ))
          ) : (
            <EmptyPanel
              title="No categories assigned yet"
              subtitle="When the backend has categories for this seller, they will appear here."
            />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Contact & location">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Public email</label>
            <input
              type="email"
              value={publicEmail}
              onChange={(event) => setPublicEmail(event.target.value)}
              className={INPUT}
              placeholder="Public email"
            />
          </div>
          <div>
            <label className={LABEL}>Public phone / Viber</label>
            <input
              type="tel"
              value={publicPhone}
              onChange={(event) => setPublicPhone(event.target.value)}
              className={INPUT}
              placeholder="Public phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Address line 1</label>
            <input
              type="text"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              className={INPUT}
              placeholder="Street or building"
            />
          </div>
          <div>
            <label className={LABEL}>Address line 2</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
              className={INPUT}
              placeholder="Unit, floor, landmark"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className={LABEL}>City / Municipality</label>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={INPUT}
              placeholder="City"
            />
          </div>
          <div>
            <label className={LABEL}>Province / Region</label>
            <input
              type="text"
              value={province}
              onChange={(event) => setProvince(event.target.value)}
              className={INPUT}
              placeholder="Province"
            />
          </div>
          <div>
            <label className={LABEL}>Postal code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
              className={INPUT}
              placeholder="Postal code"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className={LABEL}>Business address preview</label>
          <input type="text" value={addressPreview} readOnly className={INPUT} placeholder="No business address saved yet" />
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">Shown on your store page. Only include information you are comfortable making public.</p>
        </div>
      </SectionCard>

      <SectionCard title="Operating hours" subtitle="Helps buyers know when to expect replies and updates.">
        <div className="space-y-2">
          {hours.length > 0 ? (
            hours.map((row, index) => (
              <div key={`${row.day}-${index}`} className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-3">
                <input
                  type="text"
                  value={row.day}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, day: event.target.value } : item,
                      ),
                    )
                  }
                  className={INPUT}
                  placeholder="Day"
                />
                <input
                  type="text"
                  value={row.hours}
                  onChange={(event) =>
                    setHours((current) =>
                      current.map((item, currentIndex) =>
                        currentIndex === index ? { ...item, hours: event.target.value } : item,
                      ),
                    )
                  }
                  className={INPUT}
                  placeholder="Hours"
                />
                <button
                  type="button"
                  onClick={() => setHours((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="px-3 py-2.5 text-xs text-[var(--color-red)] border border-[var(--color-border)] rounded-sm hover:bg-[var(--color-surface)] cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <EmptyPanel title="No operating hours saved yet" subtitle="Add rows here to show buyers when your store is typically open." />
          )}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setHours((current) => [...current, { day: "", hours: "" }])}
            className="px-3 py-2 text-sm border border-[var(--color-border)] rounded-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)] cursor-pointer"
          >
            + Add hour row
          </button>
        </div>
      </SectionCard>

      {notice && (
        <p className={`mb-4 text-sm ${notice.toLowerCase().includes("unable") || notice.toLowerCase().includes("required") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>
          {notice}
        </p>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => void handleSave()}
          disabled={!profile || saving}
          className={`px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${
            !profile || saving ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"
          }`}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function BrandingTab({
  profile,
  onUpdated,
}: {
  profile: SellerProfile | null;
  onUpdated: (profile: SellerProfile) => void;
}) {
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [brandColors, setBrandColors] = useState<string[]>(profile?.brand_colors?.length ? profile.brand_colors : []);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setLogoFile(null);
    setBannerFile(null);
    setBrandColors(profile?.brand_colors?.length ? profile.brand_colors : []);
    setRemoveLogo(false);
    setRemoveBanner(false);
  }, [profile?.id, profile?.logo_url, profile?.banner_url]);

  const initials = useMemo(() => {
    const source = profile?.business_name?.trim() || profile?.trade_name?.trim() || "";
    if (!source) {
      return "";
    }

    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [profile]);

  const handleSave = async () => {
    if (!profile || saving) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await updateSellerProfile({
        business_name: profile.business_name,
        trade_name: profile.trade_name,
        brand_colors: brandColors,
        logo_file: logoFile,
        banner_file: bannerFile,
        remove_logo: removeLogo,
        remove_banner: removeBanner,
      });

      onUpdated(response.data);
      setLogoFile(null);
      setBannerFile(null);
      setBrandColors(response.data.brand_colors ?? []);
      setRemoveLogo(false);
      setRemoveBanner(false);
      setNotice(response.message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save branding right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionCard title="Store logo" subtitle="Shown in search results, your store page header, and order confirmations.">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-sm bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center shrink-0 overflow-hidden">
            {removeLogo ? (
              <span className="text-xs text-[var(--color-ink-disabled)]">Removed</span>
            ) : logoFile ? (
              <img src={URL.createObjectURL(logoFile)} alt="Selected logo preview" className="w-full h-full object-cover" />
            ) : profile?.logo_url ? (
              <img src={profile.logo_url} alt="Store logo" className="w-full h-full object-cover" />
            ) : initials ? (
              <span className="font-[var(--font-display)] text-4xl text-[var(--color-ink)] font-[400]">{initials}</span>
            ) : (
              <span className="text-xs text-[var(--color-ink-disabled)]">No logo</span>
            )}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="block px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white hover:bg-[var(--color-surface)] cursor-pointer transition-colors"
            >
              Upload new logo
            </button>
            <button
              type="button"
              onClick={() => {
                setRemoveLogo(true);
                setLogoFile(null);
              }}
              className="block text-xs text-[var(--color-red)] hover:underline cursor-pointer"
            >
              Remove
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setLogoFile(file);
                setRemoveLogo(false);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Store banner" subtitle="Displayed at the top of your store page.">
        <div className="rounded-sm overflow-hidden border border-[var(--color-border)] h-32 mb-3 relative bg-[var(--color-surface)]">
          {removeBanner ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-[500] text-[var(--color-ink)]">Banner removed</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Save to clear the current banner.</p>
              </div>
            </div>
          ) : bannerFile ? (
            <img src={URL.createObjectURL(bannerFile)} alt="Selected banner preview" className="w-full h-full object-cover" />
          ) : profile?.banner_url ? (
            <img src={profile.banner_url} alt="Store banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-[500] text-[var(--color-ink)]">No banner uploaded yet</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">Banner management is now wired to storage.</p>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="px-4 py-2 border border-[var(--color-border)] text-sm text-[var(--color-ink)] rounded-sm bg-white hover:bg-[var(--color-surface)] cursor-pointer"
          >
            Upload new banner
          </button>
          <button
            type="button"
            onClick={() => {
              setRemoveBanner(true);
              setBannerFile(null);
            }}
            className="text-xs text-[var(--color-red)] hover:underline cursor-pointer"
          >
            Remove banner
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setBannerFile(file);
              setRemoveBanner(false);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </SectionCard>

      <SectionCard title="Brand colors" subtitle="Used for subtle accent elements on your store page.">
        <div className="space-y-4">
          {brandColors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {brandColors.map((color, index) => (
                <div key={index} className="border border-[var(--color-border)] rounded-sm p-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : "#1A3550"}
                      onChange={(event) => {
                        const next = event.target.value.toUpperCase();
                        setBrandColors((current) => current.map((item, currentIndex) => (currentIndex === index ? next : item)));
                      }}
                      className="w-10 h-10 rounded-sm border border-[var(--color-border)] bg-white cursor-pointer"
                    />
                    <div className="flex-1">
                      <label className={LABEL}>Accent {index + 1}</label>
                      <input
                        type="text"
                        value={color}
                        onChange={(event) => {
                          const next = event.target.value.toUpperCase();
                          setBrandColors((current) => current.map((item, currentIndex) => (currentIndex === index ? next : item)));
                        }}
                        className={INPUT}
                        placeholder="#1A3550"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-sm border border-[var(--color-border)]" style={{ background: color }} />
                      <span className="text-xs text-[var(--color-ink-muted)]">{color || "No color"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBrandColors((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                      className="text-xs text-[var(--color-red)] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No brand colors saved yet" subtitle="Add up to three colors to style your store accents." />
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setBrandColors((current) => (current.length >= 3 ? current : [...current, "#1A3550"]))}
              disabled={brandColors.length >= 3}
              className={`px-4 py-2 border border-[var(--color-border)] text-sm rounded-sm ${
                brandColors.length >= 3
                  ? "text-[var(--color-ink-disabled)] bg-white cursor-not-allowed"
                  : "text-[var(--color-ink)] bg-white hover:bg-[var(--color-surface)] cursor-pointer"
              }`}
            >
              + Add color
            </button>
            <span className="text-xs text-[var(--color-ink-muted)]">Use hex colors like #1A3550. Up to 3 swatches.</span>
          </div>
        </div>
      </SectionCard>

      {notice && <p className={`mb-4 text-sm ${notice.toLowerCase().includes("unable") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{notice}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!profile || saving}
          className={`px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${
            !profile || saving ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"
          }`}
        >
          {saving ? "Saving..." : "Save branding"}
        </button>
      </div>
    </div>
  );
}

function PoliciesTab({
  profile,
  onUpdated,
}: {
  profile: SellerProfile | null;
  onUpdated: (profile: SellerProfile) => void;
}) {
  const [returnPolicy, setReturnPolicy] = useState(profile?.return_policy ?? "");
  const [shippingPolicy, setShippingPolicy] = useState(profile?.shipping_policy ?? "");
  const [privacyPolicy, setPrivacyPolicy] = useState(profile?.privacy_policy ?? "");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setReturnPolicy(profile?.return_policy ?? "");
    setShippingPolicy(profile?.shipping_policy ?? "");
    setPrivacyPolicy(profile?.privacy_policy ?? "");
  }, [profile]);

  const handleSave = async () => {
    if (!profile || saving) {
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await updateSellerProfile({
        business_name: profile.business_name,
        trade_name: profile.trade_name,
        return_policy: returnPolicy || null,
        shipping_policy: shippingPolicy || null,
        privacy_policy: privacyPolicy || null,
      });

      onUpdated(response.data);
      setNotice(response.message);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to save policies right now.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {[
        {
          title: "Return & refund policy",
          value: returnPolicy,
          setter: setReturnPolicy,
          placeholder: "Add your return and refund policy...",
        },
        {
          title: "Shipping policy",
          value: shippingPolicy,
          setter: setShippingPolicy,
          placeholder: "Add your shipping policy...",
        },
        {
          title: "Privacy policy",
          value: privacyPolicy,
          setter: setPrivacyPolicy,
          placeholder: "Add your privacy policy...",
        },
      ].map((policy) => (
        <div key={policy.title} className="bg-white border border-[var(--color-border)] rounded-sm">
          <div className="px-6 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-[600] text-[var(--color-ink)]">{policy.title}</h2>
          </div>
          <div className="px-6 py-5">
            <textarea
              rows={5}
              className={INPUT + " resize-none"}
              placeholder={policy.placeholder}
              value={policy.value}
              onChange={(event) => policy.setter(event.target.value)}
            />
            <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Saved to the seller profile and shown on the public store page.</p>
          </div>
        </div>
      ))}
      {notice && <p className={`text-sm ${notice.toLowerCase().includes("unable") ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{notice}</p>}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!profile || saving}
          className={`px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm transition-colors ${
            !profile || saving ? "opacity-60 cursor-not-allowed" : "hover:bg-[var(--color-navy-hover)] cursor-pointer"
          }`}
        >
          {saving ? "Saving..." : "Save policies"}
        </button>
      </div>
    </div>
  );
}

function PreviewTab({
  profile,
  products,
}: {
  profile: SellerProfile | null;
  products: SellerProduct[];
}) {
  const displayName = profile?.business_name?.trim() || profile?.trade_name?.trim() || "";
  const tagline = profile?.tagline?.trim() || "";
  const location = [profile?.city, profile?.province].filter(Boolean).join(", ");
  const topCategory = profile?.categories?.[0]?.name ?? "";
  const initials = displayName
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : "";

  const featuredProducts = products.slice(0, 4);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className={EMPTY_HINT}>This is how your store appears to buyers on Marketo.</p>
        <button type="button" disabled className="flex items-center gap-1.5 px-3 py-2 border border-[var(--color-border)] text-xs text-[var(--color-ink-disabled)] rounded-sm bg-white cursor-not-allowed">
          Open live store
        </button>
      </div>

      <div className="border border-[var(--color-border)] rounded-sm overflow-hidden bg-white">
        <div className="h-36 bg-[var(--color-surface)] relative overflow-hidden border-b border-[var(--color-border)]">
          {profile?.banner_url ? (
            <img src={profile.banner_url} alt="Store banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-[500] text-[var(--color-ink)]">No banner preview</p>
                <p className="text-xs text-[var(--color-ink-muted)] mt-1">A store banner will appear here once uploaded.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-end gap-4 mt-2 mb-6">
            <div className="w-16 h-16 rounded-sm bg-[var(--color-surface)] flex items-center justify-center border-4 border-white shadow shrink-0">
              {profile?.logo_url ? (
                <img src={profile.logo_url} alt="Store logo" className="w-full h-full object-cover" />
              ) : initials ? (
                <span className="font-[var(--font-display)] text-2xl text-[var(--color-ink)] font-[400]">{initials}</span>
              ) : (
                <span className="text-xs text-[var(--color-ink-disabled)]">Logo</span>
              )}
            </div>
            <div className="pb-1">
              <h2 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">
                {displayName || "No store name yet"}
              </h2>
              <p className="text-sm text-[var(--color-ink-muted)]">{tagline || "No tagline yet."}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-[var(--color-ink-muted)]">
            <span>{topCategory || "No category assigned"}</span>
            <span>{location || "No location saved yet"}</span>
            <span>{profile?.public_email || profile?.contact_email || "No public email saved yet"}</span>
          </div>
        </div>

        <div className="p-5">
          <p className="text-xs font-[var(--font-mono)] text-[var(--color-ink-muted)] uppercase tracking-widest mb-3">
            Featured products
          </p>

          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {featuredProducts.map((product) => (
                <div key={product.id} className="border border-[var(--color-border)] rounded-sm overflow-hidden">
                  <div className="aspect-square bg-[var(--color-surface)] overflow-hidden flex items-center justify-center">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-[var(--color-ink-disabled)]">No image</span>
                    )}
                  </div>
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-[500] text-[var(--color-ink)] truncate">{product.name}</p>
                    <p className="font-[var(--font-mono)] text-xs text-[var(--color-ink)]">₱{product.price.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel
              title="No products to preview yet"
              subtitle="Once the backend returns products for this seller, they will appear in this section."
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function StoreManagementPage() {
  const [tab, setTab] = useState<StoreTab>("profile");
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [profileResponse, productsResponse] = await Promise.all([
          fetchSellerProfile(),
          fetchSellerProducts(),
        ]);

        if (!active) {
          return;
        }

        setProfile(profileResponse.data);
        setProducts(productsResponse.data ?? []);
      } catch {
        if (active) {
          setProfile(null);
          setProducts([]);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const tabs: Array<{ id: StoreTab; label: string }> = [
    { id: "profile", label: "Store profile" },
    { id: "branding", label: "Branding" },
    { id: "policies", label: "Policies" },
    { id: "preview", label: "Public preview" },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)]">Store management</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Customize your store&apos;s public presence on Marketo</p>
      </div>

      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`px-5 py-2.5 text-sm font-[500] border-b-2 -mb-px cursor-pointer transition-colors whitespace-nowrap ${
              tab === item.id
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab profile={profile} onUpdated={setProfile} />}
      {tab === "branding" && <BrandingTab profile={profile} onUpdated={setProfile} />}
      {tab === "policies" && <PoliciesTab profile={profile} onUpdated={setProfile} />}
      {tab === "preview" && <PreviewTab profile={profile} products={products} />}
    </div>
  );
}
