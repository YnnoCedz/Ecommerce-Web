import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
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
import AuthLayout, { AuthAlert, Field } from "./AuthLayout"
import { logisticsLoginUrl } from "../../config/logisticsPortal"

function LocationSelect({ label, value, options, onChange, required = true }: {
  label: string; value: string; options: LocationOption[]; onChange: (value: string) => void; required?: boolean
}) {
  return <label className="block space-y-1.5">
    <span className="text-sm font-[500] text-[var(--color-ink)]">{label}{required && " *"}</span>
    <select value={value} required={required} onChange={event => onChange(event.target.value)}
      className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-navy)] focus:outline-none">
      <option value="">Select {label.toLowerCase()}</option>
      {options.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
    </select>
  </label>
}

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

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!applicantId || !businessPermit) { setError("Applicant ID and Business/DTI permit are required."); return }
    setSubmitting(true); setError(null)
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
          phone: form.phone.replace(/\D/g, "").replace(/^0/, "+63").replace(/^63/, "+63"),
          province_code: form.province_code || undefined,
          applicant_id: applicantId, business_permit: businessPermit,
        })
      navigate(response.redirect_to ?? `/auth/verify-email?email=${encodeURIComponent(form.email)}`, {
        state: { registrationMessage: response.message, verificationEmailSent: response.verification_email_sent },
      })
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === "existing_account") {
        setError("An existing Maketo identity was found. Sign in to continue your Logistics application.")
      } else setError(reason instanceof ApiError ? reason.message : "Unable to submit the Logistics application.")
    } finally { setSubmitting(false) }
  }

  return <AuthLayout title="Register a Logistics Provider" subtitle={user ? `Continue as ${user.email}. Your Logistics application remains separate from Marketplace access.` : "Create one Maketo identity and submit your provider application for Admin review."}
    footer={<span className="block space-y-1">
      {/* Logistics-specific Sign In: always the dedicated Logistics Partner Portal, never the Marketplace login. */}
      <span className="block">Already an approved Logistics partner? <a href={logisticsLoginUrl()} className="text-[var(--color-navy)] font-[500] hover:underline">Sign in to the Logistics Partner Portal</a></span>
      {/* Shared-identity continuation: an existing Maketo identity authenticates on the Marketplace login and returns here to submit the application. */}
      {!user && <span className="block">Already have a Maketo identity but not yet a Logistics partner? <Link to="/auth/login?returnTo=%2Fregister%2Flogistics" className="text-[var(--color-navy)] font-[500] hover:underline">Sign in to continue this application</Link></span>}
    </span>}>
    {error && <AuthAlert type="error" message={error} />}
    {success && <AuthAlert type="success" message={`${success} Once approved, sign in at the Logistics Partner Portal: ${logisticsLoginUrl()}`} />}
    <form onSubmit={submit} className="space-y-5">
      {!user && <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" value={form.first_name} onChange={set("first_name")} required />
        <Field label="Middle name / initial" value={form.middle_name} onChange={set("middle_name")} />
        <Field label="Last name" value={form.last_name} onChange={set("last_name")} required />
        <label className="block space-y-1.5"><span className="text-sm font-[500] text-[var(--color-ink)]">Sex *</span><select value={form.sex} required onChange={event => set("sex")(event.target.value)} className="w-full rounded-sm border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm"><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
        <Field label="Birthday" type="date" value={form.birthdate} onChange={set("birthdate")} required />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Philippine mobile number" value={form.phone} onChange={set("phone")} placeholder="09171234567" required />
        <span />
        <Field label="Password" type="password" value={form.password} onChange={set("password")} required />
        <Field label="Confirm password" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} required />
      </div>}
      <div className="border-t border-[var(--color-border)] pt-5 space-y-4">
        <h2 className="text-sm font-[600] text-[var(--color-ink)]">Provider details</h2>
        <Field label="Business / company name" value={form.company_name} onChange={set("company_name")} required />
        <Field label="Legal name" value={form.legal_name} onChange={set("legal_name")} />
        <Field label="Business address" value={form.address_line1} onChange={set("address_line1")} required />
        <Field label="Address line 2" value={form.address_line2} onChange={set("address_line2")} />
        <LocationSelect label="Region" value={form.region_code} options={regions} onChange={value => setForm(current => ({ ...current, region_code: value, province_code: "", city_code: "", barangay_code: "" }))} />
        {provinces.length > 0 && <LocationSelect label="Province" value={form.province_code} options={provinces} onChange={value => setForm(current => ({ ...current, province_code: value, city_code: "", barangay_code: "" }))} />}
        <LocationSelect label="Municipality / city" value={form.city_code} options={cities} onChange={value => setForm(current => ({ ...current, city_code: value, barangay_code: "" }))} />
        <LocationSelect label="Barangay" value={form.barangay_code} options={barangays} onChange={set("barangay_code")} />
        <Field label="Postal code" value={form.postal_code} onChange={set("postal_code")} required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm text-[var(--color-ink)]">Applicant ID *<input className="mt-1 block w-full text-sm" type="file" accept="image/*,.pdf" required onChange={event => setApplicantId(event.target.files?.[0] ?? null)} /></label>
        <label className="text-sm text-[var(--color-ink)]">Business / DTI permit *<input className="mt-1 block w-full text-sm" type="file" accept="image/*,.pdf" required onChange={event => setBusinessPermit(event.target.files?.[0] ?? null)} /></label>
      </div>
      <button type="submit" disabled={submitting || Boolean(success)} className="w-full rounded-sm bg-[var(--color-navy)] py-3 text-sm font-[500] text-white disabled:opacity-60">{submitting ? "Submitting..." : success ? "Application submitted" : "Submit Logistics registration"}</button>
    </form>
  </AuthLayout>
}
