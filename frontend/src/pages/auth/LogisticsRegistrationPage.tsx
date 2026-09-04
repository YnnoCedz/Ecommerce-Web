import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { Loader2 } from "lucide-react"
import { registerLogisticsRequest, submitLogisticsApplicationRequest } from "../../api/auth"
import { ApiError } from "../../api/client"
import { useAuth } from "../../auth/AuthContext"
import {
  fetchBarangays,
  fetchProvinceCities,
  fetchProvinces,
  fetchRegionCities,
  fetchRegions,
  type LocationOption,
} from "../../api/locations"
import AuthLayout, {
  AuthAlert,
  Field,
  FieldRow,
  FileField,
  FormSection,
  PasswordStrength,
  Select,
} from "./AuthLayout"
import { logisticsLoginUrl } from "../../config/logisticsPortal"

const SEXES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

const toOptions = (list: LocationOption[]) =>
  list.map(item => ({ value: item.code, label: item.name }))

export default function LogisticsRegistrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({
    first_name: "", middle_name: "", last_name: "", sex: "", birthdate: "", email: "", phone: "",
    password: "", password_confirmation: "", company_name: "", legal_name: "", address_line1: "",
    address_line2: "", region_code: "", province_code: "", city_code: "", barangay_code: "", postal_code: "",
  })
  const [applicantId, setApplicantId] = useState<File | null>(null)
  const [businessPermit, setBusinessPermit] = useState<File | null>(null)
  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Local subscriber digits only; the +63 country code is fixed by the control,
  // so the value posted is always the +639XXXXXXXXX shape the API validates.
  const localPhone = form.phone.replace(/\D/g, "").replace(/^63/, "").replace(/^0/, "").slice(0, 10)

  useEffect(() => {
    if (!user) return
    setForm(current => ({
      ...current,
      first_name: user.first_name ?? "",
      middle_name: user.middle_name ?? "",
      last_name: user.last_name ?? "",
      sex: user.sex ?? "",
      birthdate: user.birthdate ?? "",
      email: user.email,
      phone: user.phone ?? user.mobile ?? "",
    }))
  }, [user])

  useEffect(() => { void fetchRegions().then(setRegions).catch(() => setError("Unable to load Philippine regions.")) }, [])
  useEffect(() => {
    setProvinces([]); setCities([]); setBarangays([])
    if (!form.region_code) return
    void fetchProvinces(form.region_code).then(async list => {
      setProvinces(list)
      if (list.length === 0) setCities(await fetchRegionCities(form.region_code))
    }).catch(() => setError("Unable to load provinces."))
  }, [form.region_code])
  useEffect(() => {
    setCities([]); setBarangays([])
    if (!form.province_code) return
    void fetchProvinceCities(form.province_code).then(setCities).catch(() => setError("Unable to load cities."))
  }, [form.province_code])
  useEffect(() => {
    setBarangays([])
    if (!form.city_code) return
    void fetchBarangays(form.city_code).then(list => {
      setBarangays(list)
      const city = cities.find(item => item.code === form.city_code)
      if (city?.postal_code) setForm(current => ({ ...current, postal_code: city.postal_code ?? "" }))
    }).catch(() => setError("Unable to load barangays."))
  }, [form.city_code, cities])

  const set = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }))

  /**
   * Mirrors the Marketplace registration error treatment. It replaces the
   * native constraint bubbles the previous raw inputs relied on, so every
   * validation message renders in the shared styled controls.
   */
  function validate(): boolean {
    const next: Record<string, string> = {}

    if (!user) {
      if (!form.first_name.trim()) next.first_name = "First name is required"
      if (!form.last_name.trim()) next.last_name = "Last name is required"
      if (!form.sex) next.sex = "Select an option"
      if (!form.birthdate) next.birthdate = "Birthday is required"
      if (!form.email.trim()) next.email = "Email is required"
      else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = "Enter a valid email"
      if (!localPhone) next.phone = "Mobile number is required"
      else if (localPhone.length !== 10 || !localPhone.startsWith("9")) next.phone = "Enter a 10-digit mobile number starting with 9"
      if (!form.password) next.password = "Password is required"
      if (form.password !== form.password_confirmation) next.password_confirmation = "Passwords do not match"
    }

    if (!form.company_name.trim()) next.company_name = "Business name is required"
    if (!form.address_line1.trim()) next.address_line1 = "Business address is required"
    if (!form.region_code) next.region_code = "Region is required"
    if (provinces.length > 0 && !form.province_code) next.province_code = "Province is required"
    if (!form.city_code) next.city_code = "City or municipality is required"
    if (!form.barangay_code) next.barangay_code = "Barangay is required"
    if (!form.postal_code.trim()) next.postal_code = "Postal code is required"
    if (!applicantId) next.applicant_id = "Applicant ID is required"
    if (!businessPermit) next.business_permit = "Business / DTI permit is required"

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!validate() || !applicantId || !businessPermit) return
    setSubmitting(true)
    try {
      if (user) {
        const response = await submitLogisticsApplicationRequest({
          company_name: form.company_name,
          legal_name: form.legal_name || undefined,
          address_line1: form.address_line1,
          address_line2: form.address_line2 || undefined,
          region_code: form.region_code,
          province_code: form.province_code || undefined,
          city_code: form.city_code,
          barangay_code: form.barangay_code,
          postal_code: form.postal_code,
          applicant_id: applicantId,
          business_permit: businessPermit,
        })
        setSuccess(response.message)
        return
      }

      const response = await registerLogisticsRequest({
          ...form,
          phone: `+63${localPhone}`,
          province_code: form.province_code || undefined,
          applicant_id: applicantId, business_permit: businessPermit,
        })
      navigate(response.redirect_to ?? `/auth/verify-email?email=${encodeURIComponent(form.email)}`, {
        state: { registrationMessage: response.message, verificationEmailSent: response.verification_email_sent },
      })
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "existing_account") {
        setError("An existing Marketo identity was found. Sign in to continue your Logistics application.")
      } else {
        // Server-side 422 details land on the same fields as local validation.
        if (reason instanceof ApiError && reason.errors) {
          setErrors(Object.fromEntries(
            Object.entries(reason.errors).map(([field, messages]) => [field, messages?.[0] ?? ""]),
          ))
        }
        setError(reason instanceof ApiError ? reason.message : "Unable to submit the Logistics application.")
      }
    } finally { setSubmitting(false) }
  }

  return <AuthLayout
    width="wide"
    eyebrow="Logistics Partner"
    title="Register a Logistics Provider"
    subtitle={user
      ? `Continue as ${user.email}. Your Logistics application remains separate from Marketplace access.`
      : "Create one Marketo identity and submit your provider application for Admin review. Logistics does not require a Marketplace buyer account."}
    footer={<span className="block space-y-1">
      {/* Logistics-specific Sign In: always the dedicated Logistics Partner Portal, never the Marketplace login. */}
      <span className="block">Already an approved Logistics partner? <a href={logisticsLoginUrl()} className="text-[var(--color-navy)] font-[500] hover:underline">Sign in to the Logistics Partner Portal</a></span>
      {/* Shared-identity continuation: an existing Marketo identity authenticates on the Marketplace login and returns here to submit the application. */}
      {!user && <span className="block">Already have a Marketo identity but not yet a Logistics partner? <Link to="/auth/login?returnTo=%2Fregister%2Flogistics" className="text-[var(--color-navy)] font-[500] hover:underline">Sign in to continue this application</Link></span>}
    </span>}>
    {error && <AuthAlert type="error" message={error} />}
    {success && <AuthAlert type="success" message={`${success} Once approved, sign in at the Logistics Partner Portal: ${logisticsLoginUrl()}`} />}

    <form onSubmit={submit} className="space-y-8">
      {!user && <FormSection title="Representative information" description="The person who will manage this Logistics provider account.">
        <FieldRow>
          <Field label="First name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} required />
          <Field label="Middle name / initial" value={form.middle_name} onChange={set("middle_name")} />
        </FieldRow>
        <FieldRow>
          <Field label="Last name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} required />
          <Select label="Sex" value={form.sex} onChange={set("sex")} options={SEXES} error={errors.sex} required />
        </FieldRow>
        <FieldRow>
          <Field label="Birthday" type="date" value={form.birthdate} onChange={set("birthdate")} error={errors.birthdate} required />
          <Field label="Email address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" error={errors.email} required />
        </FieldRow>
        <FieldRow>
          <div>
            <label htmlFor="logistics-phone" className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
              Mobile number<span className="text-[var(--color-red)] ml-0.5">*</span>
            </label>
            <div className={`flex items-center rounded-sm border bg-white ${errors.phone ? "border-[var(--color-red)]" : "border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10"}`}>
              <span className="px-3 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] py-2.5">+63</span>
              <input
                id="logistics-phone"
                type="tel"
                inputMode="numeric"
                value={localPhone}
                onChange={event => set("phone")(event.target.value)}
                placeholder="9171234567"
                className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-[var(--color-ink)]"
              />
            </div>
            {errors.phone && <p className="text-xs text-[var(--color-red)] mt-1.5">{errors.phone}</p>}
          </div>
          <span className="hidden sm:block" />
        </FieldRow>
      </FormSection>}

      <FormSection title="Business information">
        <FieldRow>
          <Field label="Business / company name" value={form.company_name} onChange={set("company_name")} error={errors.company_name} required />
          <Field label="Legal name" value={form.legal_name} onChange={set("legal_name")} placeholder="Optional" />
        </FieldRow>
      </FormSection>

      <FormSection title="Business address">
        <FieldRow>
          <Field label="Business address" value={form.address_line1} onChange={set("address_line1")} placeholder="Street and building" error={errors.address_line1} required />
          <Field label="Address line 2" value={form.address_line2} onChange={set("address_line2")} placeholder="Optional" />
        </FieldRow>
        <FieldRow>
          <Select label="Region" value={form.region_code} options={toOptions(regions)} placeholder="Select region" error={errors.region_code}
            onChange={value => setForm(current => ({ ...current, region_code: value, province_code: "", city_code: "", barangay_code: "" }))} required />
          {provinces.length > 0 ? (
            <Select label="Province" value={form.province_code} options={toOptions(provinces)} placeholder="Select province" error={errors.province_code}
              onChange={value => setForm(current => ({ ...current, province_code: value, city_code: "", barangay_code: "" }))} required />
          ) : <span className="hidden sm:block" />}
        </FieldRow>
        <FieldRow>
          <Select label="Municipality / city" value={form.city_code} options={toOptions(cities)} placeholder="Select city or municipality" error={errors.city_code}
            disabled={cities.length === 0}
            onChange={value => setForm(current => ({ ...current, city_code: value, barangay_code: "" }))} required />
          <Select label="Barangay" value={form.barangay_code} options={toOptions(barangays)} placeholder="Select barangay" error={errors.barangay_code}
            disabled={barangays.length === 0} onChange={set("barangay_code")} required />
        </FieldRow>
        <FieldRow>
          <Field label="Postal code" value={form.postal_code} onChange={set("postal_code")} placeholder="1100" error={errors.postal_code} required />
          <span className="hidden sm:block" />
        </FieldRow>
      </FormSection>

      <FormSection title="Documents" description="Stored privately and visible only to Marketo administrators during review.">
        <FieldRow>
          <FileField label="Applicant ID" accept="image/*,.pdf" file={applicantId} onChange={setApplicantId} error={errors.applicant_id} required />
          <FileField label="Business / DTI permit" accept="image/*,.pdf" file={businessPermit} onChange={setBusinessPermit} error={errors.business_permit} required />
        </FieldRow>
      </FormSection>

      {!user && <FormSection title="Security">
        <FieldRow>
          <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Create a strong password" error={errors.password} required />
          <Field label="Confirm password" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} placeholder="Re-enter your password" error={errors.password_confirmation} required />
        </FieldRow>
        <PasswordStrength password={form.password} />
      </FormSection>}

      <button type="submit" disabled={submitting || Boolean(success)}
        className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
        {submitting ? (<><Loader2 size={14} className="animate-spin" aria-hidden="true" />Submitting...</>)
          : success ? "Application submitted" : "Submit Logistics registration"}
      </button>
    </form>
  </AuthLayout>
}
