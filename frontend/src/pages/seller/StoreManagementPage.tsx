import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"
import {
  fetchSellerProfile,
  fetchSellerProducts,
  fetchSellerDocuments,
  renewSellerDocument,
  updateSellerProfile,
  type SellerProduct,
  type SellerProfile,
  type SellerDocument,
} from "../../api/seller"
import PhilippineAddressSelector, {
  EMPTY_PHILIPPINE_ADDRESS,
  type PhilippineAddressValue,
} from "../../components/PhilippineAddressSelector"
import PhilippinePhoneField from "../../components/PhilippinePhoneField"
import { useToast } from "../../components/ToastProvider"
import { DEFAULT_SELLER_BANNER } from "../pub/visuals"
import { useUrlTab } from "../../hooks/useUrlTab"

type StoreTab = "profile" | "branding" | "policies" | "renewal" | "preview"
type EditProps = { isEditing: boolean; onEdit: () => void; onCancel: () => void }

const STORE_TABS: readonly StoreTab[] = [
  "profile",
  "branding",
  "policies",
  "renewal",
  "preview",
]

const INPUT =
  "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-muted)]"
const LABEL = "block text-sm font-[500] text-[var(--color-ink)] mb-1.5"

function EditActions({
  isEditing,
  saving,
  saveLabel,
  onEdit,
  onCancel,
  onSave,
}: EditProps & { saving: boolean; saveLabel: string; onSave: () => void }) {
  if (!isEditing)
    return (
      <button
        type="button"
        onClick={onEdit}
        className="px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm hover:bg-[var(--color-surface)]"
      >
        Edit
      </button>
    )
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm hover:bg-[var(--color-surface)] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-sm text-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
      >
        {saving ? "Saving..." : saveLabel}
      </button>
    </div>
  )
}

function TabHeader({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-[var(--font-display)] text-xl text-[var(--color-ink)]">
        {title}
      </h2>
      {children}
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-5 rounded-sm border border-[var(--color-border)] bg-white">
      <div className="border-b border-[var(--color-border)] px-6 py-4">
        <h3 className="text-sm font-[600] text-[var(--color-ink)]">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

function profileAddress(profile: SellerProfile | null): PhilippineAddressValue {
  return {
    ...EMPTY_PHILIPPINE_ADDRESS,
    region: profile?.region ?? "",
    region_code: profile?.region_code ?? "",
    province: profile?.province ?? "",
    province_code: profile?.province_code ?? "",
    city: profile?.city ?? "",
    city_code: profile?.city_code ?? "",
    barangay: profile?.barangay ?? "",
    barangay_code: profile?.barangay_code ?? "",
    postal_code: profile?.postal_code ?? "",
  }
}

function ProfileTab({
  profile,
  onUpdated,
  ...edit
}: {
  profile: SellerProfile | null
  onUpdated: (profile: SellerProfile) => void
} & EditProps) {
  const { showToast } = useToast()
  const [businessName, setBusinessName] = useState("")
  const [slug, setSlug] = useState("")
  const [tagline, setTagline] = useState("")
  const [description, setDescription] = useState("")
  const [publicEmail, setPublicEmail] = useState("")
  const [publicPhone, setPublicPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [address, setAddress] = useState<PhilippineAddressValue>(
    EMPTY_PHILIPPINE_ADDRESS,
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setBusinessName(profile?.business_name ?? "")
    setSlug(profile?.slug ?? "")
    setTagline(profile?.tagline ?? "")
    setDescription(profile?.description ?? "")
    setPublicEmail(profile?.public_email ?? profile?.contact_email ?? "")
    setPublicPhone(profile?.messaging_phone ?? profile?.contact_phone ?? "")
    setAddressLine1(profile?.address_line1 ?? "")
    setAddressLine2(profile?.address_line2 ?? "")
    setAddress(profileAddress(profile))
    setError(null)
  }
  useEffect(reset, [profile, edit.isEditing])
  const cancel = () => {
    reset()
    edit.onCancel()
  }
  const save = async () => {
    if (!profile || saving) return
    if (!businessName.trim()) {
      setError("Store name is required before saving.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const response = await updateSellerProfile({
        business_name: businessName.trim(),
        slug: slug.trim() || null,
        trade_name: profile.trade_name,
        tagline: tagline || null,
        description: description || null,
        public_email: publicEmail || null,
        messaging_phone: publicPhone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        region_code: address.region_code || null,
        province_code: address.province_code || null,
        city_code: address.city_code || null,
        barangay_code: address.barangay_code || null,
        postal_code: address.postal_code || null,
      })
      onUpdated(response.data)
      window.dispatchEvent(
        new CustomEvent("seller-profile-updated", { detail: response.data }),
      )
      edit.onCancel()
      showToast({
        kind: "success",
        title: "Store profile updated successfully.",
      })
    } catch (caught) {
      setError("We couldn't save your store profile. Please try again.")
      showToast({
        kind: "error",
        title: "Store profile was not updated.",
        error: caught,
        errorContext: "seller",
        fallbackMessage: "We couldn't save your store profile. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }
  const preview = [
    addressLine1,
    addressLine2,
    address.barangay,
    address.city,
    address.province || address.region,
    address.postal_code,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <div>
      <TabHeader title="Store profile">
        <EditActions
          {...edit}
          onCancel={cancel}
          saving={saving}
          saveLabel="Save changes"
          onSave={() => void save()}
        />
      </TabHeader>
      <SectionCard title="Store identity">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Store name *</label>
            <input
              value={businessName}
              disabled={!edit.isEditing}
              onChange={(event) => setBusinessName(event.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Store URL slug</label>
            <input
              value={slug}
              disabled={!edit.isEditing}
              onChange={(event) => setSlug(event.target.value)}
              className={INPUT}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className={LABEL}>Tagline</label>
          <input
            value={tagline}
            disabled={!edit.isEditing}
            onChange={(event) => setTagline(event.target.value)}
            className={INPUT}
          />
        </div>
        <div className="mt-4">
          <label className={LABEL}>Store description</label>
          <textarea
            rows={5}
            value={description}
            disabled={!edit.isEditing}
            onChange={(event) => setDescription(event.target.value)}
            className={`${INPUT} resize-none`}
          />
        </div>
      </SectionCard>
      <SectionCard
        title="Approved categories"
        subtitle="Your approved selling categories are managed through seller verification."
      >
        <div className="flex flex-wrap gap-2">
          {(profile?.categories ?? []).length ? (
            profile!.categories.map((category) => (
              <span
                key={category.id}
                className="rounded border border-[var(--color-navy)]/20 bg-[var(--color-navy-surface)] px-3 py-1.5 text-xs text-[var(--color-navy)]"
              >
                {category.name}
              </span>
            ))
          ) : (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No approved categories assigned yet.
            </p>
          )}
        </div>
      </SectionCard>
      <SectionCard
        title="Contact & location"
        subtitle="This is your public business location, not a buyer shipping address."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>Public email</label>
            <input
              type="email"
              value={publicEmail}
              disabled={!edit.isEditing}
              onChange={(event) => setPublicEmail(event.target.value)}
              className={INPUT}
            />
          </div>
          <PhilippinePhoneField
            label="Public phone / Viber"
            value={publicPhone}
            disabled={!edit.isEditing}
            onChange={setPublicPhone}
          />
          <div>
            <label className={LABEL}>Street / building</label>
            <input
              value={addressLine1}
              disabled={!edit.isEditing}
              onChange={(event) => setAddressLine1(event.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>
              Subdivision / village / landmark (optional)
            </label>
            <input
              value={addressLine2}
              disabled={!edit.isEditing}
              onChange={(event) => setAddressLine2(event.target.value)}
              className={INPUT}
            />
          </div>
        </div>
        <div className="mt-4">
          <PhilippineAddressSelector
            value={address}
            onChange={setAddress}
            disabled={!edit.isEditing}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className={LABEL}>ZIP code</label>
            <input
              value={address.postal_code}
              readOnly
              disabled={!edit.isEditing}
              className={INPUT}
              placeholder="Selected automatically"
            />
          </div>
          <div>
            <label className={LABEL}>Business address preview</label>
            <input
              value={preview}
              readOnly
              disabled={!edit.isEditing}
              className={INPUT}
              placeholder="No business address saved yet"
            />
          </div>
        </div>
      </SectionCard>
      {error && (
        <p role="alert" className="text-sm text-[var(--color-red)]">
          {error}
        </p>
      )}
    </div>
  )
}

function BrandingTab({
  profile,
  onUpdated,
  ...edit
}: {
  profile: SellerProfile | null
  onUpdated: (profile: SellerProfile) => void
} & EditProps) {
  const { showToast } = useToast()
  const logoInput = useRef<HTMLInputElement>(null)
  const bannerInput = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeBanner, setRemoveBanner] = useState(false)
  const [saving, setSaving] = useState(false)
  const reset = () => {
    setLogoFile(null)
    setBannerFile(null)
    setRemoveLogo(false)
    setRemoveBanner(false)
  }
  useEffect(reset, [profile, edit.isEditing])
  const cancel = () => {
    reset()
    edit.onCancel()
  }
  const save = async () => {
    if (!profile || saving) return
    setSaving(true)
    try {
      const response = await updateSellerProfile({
        business_name: profile.business_name,
        logo_file: logoFile,
        banner_file: bannerFile,
        remove_logo: removeLogo,
        remove_banner: removeBanner,
      })
      onUpdated(response.data)
      window.dispatchEvent(
        new CustomEvent("seller-profile-updated", { detail: response.data }),
      )
      edit.onCancel()
      showToast({ kind: "success", title: "Branding updated successfully." })
    } catch (caught) {
      showToast({
        kind: "error",
        title: "Branding was not updated.",
        error: caught,
        errorContext: "upload",
        fallbackMessage: "We couldn't update your store branding. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }
  const initials = useMemo(
    () =>
      (profile?.business_name ?? "")
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join(""),
    [profile?.business_name],
  )
  return (
    <div>
      <TabHeader title="Branding">
        <EditActions
          {...edit}
          onCancel={cancel}
          saving={saving}
          saveLabel="Save branding"
          onSave={() => void save()}
        />
      </TabHeader>
      <SectionCard
        title="Store logo"
        subtitle="Shown in search results, your store page header, and order confirmations."
      >
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 shrink-0 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center">
            {removeLogo ? (
              <span className="text-xs">Removed</span>
            ) : logoFile ? (
              <img
                src={URL.createObjectURL(logoFile)}
                alt="Selected logo preview"
                className="h-full w-full object-cover"
              />
            ) : profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Store logo"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl">{initials || "Logo"}</span>
            )}
          </div>
          {edit.isEditing && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="block px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm"
              >
                Upload new logo
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemoveLogo(true)
                  setLogoFile(null)
                }}
                className="text-xs text-[var(--color-red)]"
              >
                Remove logo
              </button>
            </div>
          )}
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              setLogoFile(event.target.files?.[0] ?? null)
              setRemoveLogo(false)
              event.currentTarget.value = ""
            }}
          />
        </div>
      </SectionCard>
      <SectionCard
        title="Store banner"
        subtitle="Displayed at the top of your store page."
      >
        <div className="relative mb-3 h-32 overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)]">
          {removeBanner ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm">
              Banner removed
            </div>
          ) : (
            <img
              src={
                bannerFile
                  ? URL.createObjectURL(bannerFile)
                  : profile?.banner_url ||
                    `${DEFAULT_SELLER_BANNER}?w=1400&h=400&fit=crop&auto=format`
              }
              alt="Store banner"
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {edit.isEditing && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => bannerInput.current?.click()}
              className="px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm"
            >
              Upload new banner
            </button>
            <button
              type="button"
              onClick={() => {
                setRemoveBanner(true)
                setBannerFile(null)
              }}
              className="text-xs text-[var(--color-red)]"
            >
              Remove banner
            </button>
          </div>
        )}
        <input
          ref={bannerInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            setBannerFile(event.target.files?.[0] ?? null)
            setRemoveBanner(false)
            event.currentTarget.value = ""
          }}
        />
      </SectionCard>
    </div>
  )
}

function PoliciesTab({
  profile,
  onUpdated,
  ...edit
}: {
  profile: SellerProfile | null
  onUpdated: (profile: SellerProfile) => void
} & EditProps) {
  const { showToast } = useToast()
  const [values, setValues] = useState({
    returns: "",
    shipping: "",
    privacy: "",
  })
  const [saving, setSaving] = useState(false)
  const reset = () =>
    setValues({
      returns: profile?.return_policy ?? "",
      shipping: profile?.shipping_policy ?? "",
      privacy: profile?.privacy_policy ?? "",
    })
  useEffect(reset, [profile, edit.isEditing])
  const cancel = () => {
    reset()
    edit.onCancel()
  }
  const save = async () => {
    if (!profile || saving) return
    setSaving(true)
    try {
      const response = await updateSellerProfile({
        business_name: profile.business_name,
        return_policy: values.returns || null,
        shipping_policy: values.shipping || null,
        privacy_policy: values.privacy || null,
      })
      onUpdated(response.data)
      edit.onCancel()
      showToast({ kind: "success", title: "Policies updated successfully." })
    } catch (caught) {
      showToast({
        kind: "error",
        title: "Policies were not updated.",
        error: caught,
        errorContext: "seller",
        fallbackMessage: "We couldn't update your store policies. Please try again.",
      })
    } finally {
      setSaving(false)
    }
  }
  return (
    <div>
      <TabHeader title="Policies">
        <EditActions
          {...edit}
          onCancel={cancel}
          saving={saving}
          saveLabel="Save policies"
          onSave={() => void save()}
        />
      </TabHeader>
      {([
        ["Return & refund policy", "returns"],
        ["Shipping policy", "shipping"],
        ["Privacy policy", "privacy"],
      ] as const).map(([title, key]) => (
        <SectionCard key={key} title={title}>
          <textarea
            rows={5}
            value={values[key]}
            disabled={!edit.isEditing}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [key]: event.target.value,
              }))
            }
            className={`${INPUT} resize-none`}
          />
        </SectionCard>
      ))}
    </div>
  )
}

function RenewalTab() {
  const { showToast } = useToast()
  const [documents, setDocuments] = useState<SellerDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<number | null>(null)
  const load = () => {
    setLoading(true)
    void fetchSellerDocuments()
      .then((response) => setDocuments(response.data))
      .catch((error: Error) => showToast(error.message, "error"))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])
  const submit = async (document: SellerDocument, file: File) => {
    setSubmitting(document.id)
    try {
      const response = await renewSellerDocument(document.id, file)
      showToast(response.message, "success")
      load()
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to submit renewal.", "error")
    } finally { setSubmitting(null) }
  }
  const labels: Record<string, string> = { owner_id: "Owner ID", seller_certificate: "Seller certificate", business_document: "Business document" }
  return <div><TabHeader title="Document renewal"><span /></TabHeader>
    {loading && <p className="py-10 text-center text-sm text-[var(--color-ink-muted)]">Loading documents...</p>}
    {!loading && documents.length === 0 && <SectionCard title="No documents available"><p className="text-sm text-[var(--color-ink-muted)]">No approved seller documents are attached to this store.</p></SectionCard>}
    <div className="space-y-3">{documents.map((document) => <section key={document.id} className="border border-[var(--color-border)] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-[600]">{labels[document.document_type] ?? document.document_type.replaceAll("_", " ")}</h3><p className="mt-1 text-xs text-[var(--color-ink-muted)]">Uploaded {document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : "—"} · Expires {document.expires_at ? new Date(document.expires_at).toLocaleDateString() : "Not tracked"}</p><span className="mt-2 inline-block bg-[var(--color-surface)] px-2 py-1 text-xs capitalize">{document.display_status.replaceAll("_", " ")}</span>{document.renewal?.review_notes && <p className="mt-2 text-xs text-[var(--color-red)]">Review note: {document.renewal.review_notes}</p>}</div><label className={`cursor-pointer border border-[var(--color-border)] px-3 py-2 text-xs ${document.display_status === "renewal_pending" || submitting === document.id ? "pointer-events-none opacity-50" : ""}`}>{submitting === document.id ? "Uploading..." : document.display_status === "renewal_pending" ? "Pending admin review" : "Renew document"}<input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void submit(document, file); event.currentTarget.value = "" }}/></label></div></section>)}</div>
  </div>
}

function PreviewTab({
  profile,
  products,
  onEdit,
}: {
  profile: SellerProfile | null
  products: SellerProduct[]
  onEdit: () => void
}) {
  const navigate = useNavigate()
  const name =
    profile?.business_name || profile?.trade_name || "No store name yet"
  return (
    <div>
      <TabHeader title="Public preview">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2 border border-[var(--color-border)] rounded-sm text-sm"
          >
            Edit store
          </button>
          {profile?.slug && (
            <button
              type="button"
              onClick={() => navigate(`/s/${profile.slug}`)}
              className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-sm text-sm"
            >
              Open live store
            </button>
          )}
        </div>
      </TabHeader>
      <div className="overflow-hidden rounded-sm border border-[var(--color-border)] bg-white">
        <div className="h-36 overflow-hidden bg-[var(--color-surface)]">
          <img
            src={
              profile?.banner_url ||
              `${DEFAULT_SELLER_BANNER}?w=1400&h=400&fit=crop&auto=format`
            }
            alt="Store banner"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <h2 className="font-[var(--font-display)] text-xl">{name}</h2>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {profile?.tagline || "No tagline yet."}
          </p>
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            {[profile?.city, profile?.province || profile?.region]
              .filter(Boolean)
              .join(", ") || "No location saved yet"}
          </p>
        </div>
        <div className="p-5">
          <p className="mb-3 text-xs uppercase tracking-widest text-[var(--color-ink-muted)]">
            Featured products
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 4).map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-sm border border-[var(--color-border)]"
              >
                <div className="aspect-square bg-[var(--color-surface)]">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-[500]">{product.name}</p>
                  <p className="text-xs">
                    PHP {product.price.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!products.length && (
            <p className="text-sm text-[var(--color-ink-muted)]">
              No products to preview yet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function StoreManagementPage() {
  const { activeTab: tab, setActiveTab: setTab } = useUrlTab(
    STORE_TABS,
    "profile",
  )
  const [editingTab, setEditingTab] = useState<StoreTab | null>(null)
  const [profile, setProfile] = useState<SellerProfile | null>(null)
  const [products, setProducts] = useState<SellerProduct[]>([])
  useEffect(() => {
    let active = true
    void Promise.all([fetchSellerProfile(), fetchSellerProducts()])
      .then(([profileResponse, productsResponse]) => {
        if (!active) return
        setProfile(profileResponse.data)
        setProducts(productsResponse.data ?? [])
      })
      .catch(() => {
        if (active) {
          setProfile(null)
          setProducts([])
        }
      })
    return () => {
      active = false
    }
  }, [])
  const selectTab = (next: StoreTab) => {
    setTab(next)
    setEditingTab(null)
  }
  const editProps: EditProps = {
    isEditing: editingTab === tab,
    onEdit: () => setEditingTab(tab),
    onCancel: () => setEditingTab(null),
  }
  const tabs: Array<{ id: StoreTab; label: string }> = [
    { id: "profile", label: "Store profile" },
    { id: "branding", label: "Branding" },
    { id: "policies", label: "Policies" },
    { id: "renewal", label: "Renewal" },
    { id: "preview", label: "Public preview" },
  ]
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">
          Store management
        </h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Customize your store&apos;s public presence on Marketo
        </p>
      </div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-[var(--color-border)]">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={`-mb-px whitespace-nowrap border-b-2 px-5 py-2.5 text-sm font-[500] ${
              tab === item.id
                ? "border-[var(--color-navy)] text-[var(--color-navy)]"
                : "border-transparent text-[var(--color-ink-muted)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "profile" && (
        <ProfileTab profile={profile} onUpdated={setProfile} {...editProps} />
      )}
      {tab === "branding" && (
        <BrandingTab profile={profile} onUpdated={setProfile} {...editProps} />
      )}
      {tab === "policies" && (
        <PoliciesTab profile={profile} onUpdated={setProfile} {...editProps} />
      )}
      {tab === "renewal" && <RenewalTab />}
      {tab === "preview" && (
        <PreviewTab
          profile={profile}
          products={products}
          onEdit={() => {
            setTab("profile")
            setEditingTab("profile")
          }}
        />
      )}
    </div>
  )
}
