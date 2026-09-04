import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router"
import {
  ApiError, fetchBarangays, fetchProvinceCities, fetchProvinces, fetchRegionCities, fetchRegions,
  submitApplication, type AuthUser, type LocationOption,
} from "../api"
import AuthLayout from "../components/AuthLayout"
import { Alert, Button, Field, FieldRow, FileField, FormSection, Select } from "../components/ui"

/**
 * Logistics provider application for an identity that is already signed in to
 * this portal.
 *
 * The portal is the single logistics door, so an existing Marketo identity
 * applies here rather than authenticating on the Marketplace. Only the fields
 * POST /api/logistics/applications accepts are collected; personal details come
 * from the signed-in identity, so they are never re-asked.
 */

const toOptions = (list: LocationOption[]) => list.map(item => ({ value: item.code, label: item.name }))

export default function ApplyPage({ user }: { user: AuthUser }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    company_name: "", legal_name: "", address_line1: "", address_line2: "",
    region_code: "", province_code: "", city_code: "", barangay_code: "", postal_code: "",
  })
  const [applicantId, setApplicantId] = useState<File | null>(null)
  const [businessPermit, setBusinessPermit] = useState<File | null>(null)
  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void fetchRegions().then(setRegions).catch(() => setError("Unable to load Philippine regions."))
  }, [])

  useEffect(() => {
    setProvinces([]); setCities([]); setBarangays([])
    if (!form.region_code) return
    void fetchProvinces(form.region_code).then(async list => {
      setProvinces(list)
      // NCR and other single-tier regions expose cities directly.
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

  function validate(): boolean {
    const next: Record<string, string> = {}
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
      await submitApplication({
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
      navigate("/application-status", { replace: true })
    } catch (reason) {
      // Server-side 422 details land on the same fields as local validation.
      if (reason instanceof ApiError && reason.errors) {
        setErrors(Object.fromEntries(
          Object.entries(reason.errors).map(([field, messages]) => [field, messages?.[0] ?? ""]),
        ))
      }
      setError(reason instanceof Error ? reason.message : "Unable to submit the Logistics application.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      width="wide"
      title="Apply as a Logistics Provider"
      subtitle={`Applying as ${user.email}. A Marketo administrator reviews every provider application.`}
      footnote={<button type="button" onClick={() => navigate("/application-status")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Back to application status</button>}
    >
      {error && <Alert>{error}</Alert>}

      <form onSubmit={submit} className="space-y-8">
        <FormSection title="Business information">
          <FieldRow>
            <Field id="apply-company" label="Business / company name" value={form.company_name} onChange={set("company_name")} error={errors.company_name} required />
            <Field id="apply-legal" label="Legal name" value={form.legal_name} onChange={set("legal_name")} placeholder="Optional" error={errors.legal_name} />
          </FieldRow>
        </FormSection>

        <FormSection title="Business address">
          <FieldRow>
            <Field id="apply-address1" label="Business address" value={form.address_line1} onChange={set("address_line1")} placeholder="Street and building" error={errors.address_line1} required />
            <Field id="apply-address2" label="Address line 2" value={form.address_line2} onChange={set("address_line2")} placeholder="Optional" error={errors.address_line2} />
          </FieldRow>
          <FieldRow>
            <Select id="apply-region" label="Region" value={form.region_code} options={toOptions(regions)} placeholder="Select region" error={errors.region_code} required
              onChange={value => setForm(current => ({ ...current, region_code: value, province_code: "", city_code: "", barangay_code: "" }))} />
            {provinces.length > 0 ? (
              <Select id="apply-province" label="Province" value={form.province_code} options={toOptions(provinces)} placeholder="Select province" error={errors.province_code} required
                onChange={value => setForm(current => ({ ...current, province_code: value, city_code: "", barangay_code: "" }))} />
            ) : <span className="hidden sm:block" />}
          </FieldRow>
          <FieldRow>
            <Select id="apply-city" label="Municipality / city" value={form.city_code} options={toOptions(cities)} placeholder="Select city or municipality"
              disabled={cities.length === 0} error={errors.city_code} required
              onChange={value => setForm(current => ({ ...current, city_code: value, barangay_code: "" }))} />
            <Select id="apply-barangay" label="Barangay" value={form.barangay_code} options={toOptions(barangays)} placeholder="Select barangay"
              disabled={barangays.length === 0} error={errors.barangay_code} required onChange={set("barangay_code")} />
          </FieldRow>
          <FieldRow>
            <Field id="apply-postal" label="Postal code" value={form.postal_code} onChange={set("postal_code")} placeholder="1100" error={errors.postal_code} required />
            <span className="hidden sm:block" />
          </FieldRow>
        </FormSection>

        <FormSection title="Documents" description="Stored privately and visible only to Marketo administrators during review.">
          <FieldRow>
            <FileField id="apply-applicant-id" label="Applicant ID" accept="image/*,.pdf" onChange={setApplicantId} error={errors.applicant_id} required />
            <FileField id="apply-permit" label="Business / DTI permit" accept="image/*,.pdf" onChange={setBusinessPermit} error={errors.business_permit} required />
          </FieldRow>
        </FormSection>

        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Submitting..." : "Submit application"}
        </Button>
      </form>
    </AuthLayout>
  )
}
