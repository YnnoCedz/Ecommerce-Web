import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
import { Loader2 } from "lucide-react"
import { useAuth } from "../../auth/AuthContext"
import { ApiError } from "../../api/client"
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

const SEXES = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

const MINIMUM_AGE = 18
const MAX_ID_BYTES = 8 * 1024 * 1024

/** Age is always derived from the birthdate and is never sent or stored. */
function deriveAge(birthdate: string): number | null {
  if (!birthdate) return null
  const dob = new Date(birthdate)
  if (Number.isNaN(dob.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const monthDelta = today.getMonth() - dob.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }

  return age < 0 || age > 120 ? null : age
}

function normalizePhilippinePhone(local: string): string {
  return `+63${local.replace(/\D/g, "").slice(0, 10)}`
}

const toOptions = (list: LocationOption[]) =>
  list.map(item => ({ value: item.code, label: item.name }))

export default function UserRegistrationPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedReturn = searchParams.get("returnTo") ?? ""
  const safeReturn =
    requestedReturn.startsWith("/") && !requestedReturn.startsWith("//")
      ? requestedReturn
      : null

  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [lastName, setLastName] = useState("")
  const [sex, setSex] = useState("")
  const [birthdate, setBirthdate] = useState("")
  const [email, setEmail] = useState("")
  const [phoneLocal, setPhoneLocal] = useState("")
  const [houseNumber, setHouseNumber] = useState("")
  const [street, setStreet] = useState("")
  const [regionCode, setRegionCode] = useState("")
  const [provinceCode, setProvinceCode] = useState("")
  const [cityCode, setCityCode] = useState("")
  const [barangayCode, setBarangayCode] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [idDocument, setIdDocument] = useState<File | null>(null)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const [regions, setRegions] = useState<LocationOption[]>([])
  const [provinces, setProvinces] = useState<LocationOption[]>([])
  const [cities, setCities] = useState<LocationOption[]>([])
  const [barangays, setBarangays] = useState<LocationOption[]>([])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const age = useMemo(() => deriveAge(birthdate), [birthdate])
  const displayPhone = phoneLocal.replace(/\D/g, "").slice(0, 10)

  useEffect(() => {
    fetchRegions()
      .then(setRegions)
      .catch(() => setMessage("Unable to load Philippine regions right now."))
  }, [])

  useEffect(() => {
    setProvinceCode("")
    setCityCode("")
    setBarangayCode("")
    setProvinces([])
    setCities([])
    setBarangays([])
    if (!regionCode) return

    let active = true
    fetchProvinces(regionCode)
      .then(async list => {
        if (!active) return
        setProvinces(list)
        // NCR and other single-tier regions expose cities directly.
        if (list.length === 0) {
          const regionCities = await fetchRegionCities(regionCode)
          if (active) setCities(regionCities)
        }
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [regionCode])

  useEffect(() => {
    if (!provinceCode) return
    setCityCode("")
    setBarangayCode("")
    setBarangays([])

    let active = true
    fetchProvinceCities(provinceCode)
      .then(list => {
        if (active) setCities(list)
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [provinceCode])

  useEffect(() => {
    setBarangayCode("")
    setBarangays([])
    if (!cityCode) return

    let active = true
    fetchBarangays(cityCode)
      .then(list => {
        if (active) setBarangays(list)
      })
      .catch(() => undefined)

    const city = cities.find(item => item.code === cityCode)
    if (city?.postal_code) setPostalCode(city.postal_code)

    return () => {
      active = false
    }
  }, [cityCode, cities])

  function validate(): boolean {
    const e: Record<string, string> = {}

    if (!firstName.trim()) e.firstName = "First name is required"
    if (!lastName.trim()) e.lastName = "Last name is required"
    if (!sex) e.sex = "Select an option"
    if (!birthdate) e.birthdate = "Birthday is required"
    else if (age === null) e.birthdate = "Enter a valid birthday"
    else if (age < MINIMUM_AGE)
      e.birthdate = `You must be at least ${MINIMUM_AGE} years old`
    if (!email.trim()) e.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email"
    if (!displayPhone) e.phone = "Phone number is required"
    else if (displayPhone.length !== 10 || !displayPhone.startsWith("9"))
      e.phone = "Enter a 10-digit mobile number starting with 9"
    if (!street.trim()) e.street = "Street is required"
    if (!regionCode) e.regionCode = "Region is required"
    if (provinces.length > 0 && !provinceCode)
      e.provinceCode = "Province is required"
    if (!cityCode) e.cityCode = "City or municipality is required"
    if (!barangayCode) e.barangayCode = "Barangay is required"
    if (!postalCode.trim()) e.postalCode = "Postal code is required"
    if (!idDocument) e.idDocument = "A valid government-issued ID is required"
    else if (idDocument.size > MAX_ID_BYTES)
      e.idDocument = "The ID image must not exceed 8 MB"
    if (!password) e.password = "Password is required"
    if (password !== confirm) e.confirm = "Passwords do not match"

    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    if (submittingRef.current) return
    if (!validate()) return

    submittingRef.current = true
    setSubmitting(true)

    try {
      // House number and street are collected separately for clarity but stored
      // as one address line, matching the existing `addresses.line1` shape.
      const line1 = [houseNumber.trim(), street.trim()]
        .filter(Boolean)
        .join(" ")

      await register({
        first_name: firstName.trim(),
        middle_name: middleName.trim() || undefined,
        last_name: lastName.trim(),
        sex,
        birthdate,
        email: email.trim(),
        phone: normalizePhilippinePhone(displayPhone),
        address_line1: line1,
        region_code: regionCode,
        province_code: provinceCode || undefined,
        city_code: cityCode,
        barangay_code: barangayCode,
        postal_code: postalCode.trim(),
        id_document: idDocument as File,
        password,
        password_confirmation: confirm,
      })

      navigate(
        `/auth/verify-email?email=${encodeURIComponent(email.trim())}${
          safeReturn ? `&returnTo=${encodeURIComponent(safeReturn)}` : ""
        }`,
        { replace: true },
      )
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          navigate(
            `/auth/verify-email?email=${encodeURIComponent(email.trim())}`,
            { replace: true },
          )
          return
        }

        if (err.errors) {
          setErrors({
            firstName: err.errors.first_name?.[0] ?? "",
            middleName: err.errors.middle_name?.[0] ?? "",
            lastName: err.errors.last_name?.[0] ?? "",
            sex: err.errors.sex?.[0] ?? "",
            birthdate: err.errors.birthdate?.[0] ?? "",
            email: err.errors.email?.[0] ?? "",
            phone: err.errors.phone?.[0] ?? "",
            street: err.errors.address_line1?.[0] ?? "",
            regionCode: err.errors.region_code?.[0] ?? "",
            provinceCode: err.errors.province_code?.[0] ?? "",
            cityCode: err.errors.city_code?.[0] ?? "",
            barangayCode: err.errors.barangay_code?.[0] ?? "",
            postalCode: err.errors.postal_code?.[0] ?? "",
            idDocument: err.errors.id_document?.[0] ?? "",
            password: err.errors.password?.[0] ?? "",
            confirm: err.errors.password_confirmation?.[0] ?? "",
          })
        }
      }

      setMessage(
        err instanceof Error ? err.message : "Unable to complete registration.",
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      width="wide"
      title="Create your Marketo account"
      subtitle="Verify your email, then a Marketo administrator reviews your registration before your account is activated."
      footer={
        <span>
          Already have an account?{" "}
          <Link
            to="/auth/login"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Sign in
          </Link>
          {" · "}
          <Link
            to="/register"
            className="text-[var(--color-navy)] font-[500] hover:underline"
          >
            Change account type
          </Link>
        </span>
      }
    >
      {message && <AuthAlert type="error" message={message} />}

      <form onSubmit={submit} className="space-y-8">
        <FormSection title="Personal information">
          <FieldRow>
            <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Ana" error={errors.firstName} required />
            <Field label="Middle name" value={middleName} onChange={setMiddleName} placeholder="Optional" error={errors.middleName} />
          </FieldRow>
          <FieldRow>
            <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Reyes" error={errors.lastName} required />
            <Select label="Sex" value={sex} onChange={setSex} options={SEXES} error={errors.sex} required />
          </FieldRow>
          <FieldRow>
            <Field label="Birthday" type="date" value={birthdate} onChange={setBirthdate} error={errors.birthdate} required />
            <div>
              <label htmlFor="registration-age" className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
                Age
              </label>
              <input
                id="registration-age"
                readOnly
                disabled
                value={age === null ? "" : String(age)}
                placeholder="—"
                aria-label="Age, calculated from your birthday"
                className="w-full px-3.5 py-2.5 text-sm rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-muted)]"
              />
              <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">
                Calculated from your birthday
              </p>
            </div>
          </FieldRow>
        </FormSection>

        <FormSection title="Contact information">
          <FieldRow>
            <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} required />
            <div>
              <label htmlFor="registration-phone" className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
                Mobile number<span className="text-[var(--color-red)] ml-0.5">*</span>
              </label>
              <div
                className={`flex items-center rounded-sm border bg-white ${
                  errors.phone
                    ? "border-[var(--color-red)]"
                    : "border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10"
                }`}
              >
                <span className="px-3 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] py-2.5">
                  +63
                </span>
                <input
                  id="registration-phone"
                  type="tel"
                  inputMode="numeric"
                  value={displayPhone}
                  onChange={e => setPhoneLocal(e.target.value)}
                  placeholder="9171234567"
                  className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-[var(--color-ink)]"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-[var(--color-red)] mt-1.5">{errors.phone}</p>
              )}
            </div>
          </FieldRow>
        </FormSection>

        <FormSection title="Address">
          <FieldRow>
            <Select label="Region" value={regionCode} onChange={setRegionCode} options={toOptions(regions)} error={errors.regionCode} placeholder="Select region" required />
            {provinces.length > 0 ? (
              <Select label="Province" value={provinceCode} onChange={setProvinceCode} options={toOptions(provinces)} error={errors.provinceCode} placeholder="Select province" required />
            ) : (
              <span className="hidden sm:block" />
            )}
          </FieldRow>
          <FieldRow>
            <Select label="City / Municipality" value={cityCode} onChange={setCityCode} options={toOptions(cities)} error={errors.cityCode} placeholder="Select city or municipality" disabled={cities.length === 0} required />
            <Select label="Barangay" value={barangayCode} onChange={setBarangayCode} options={toOptions(barangays)} error={errors.barangayCode} placeholder="Select barangay" disabled={barangays.length === 0} required />
          </FieldRow>
          <FieldRow>
            <Field label="House number" value={houseNumber} onChange={setHouseNumber} placeholder="12" />
            <Field label="Street" value={street} onChange={setStreet} placeholder="Mabini Street" error={errors.street} required />
          </FieldRow>
          <FieldRow>
            <Field label="Postal code" value={postalCode} onChange={setPostalCode} placeholder="1100" error={errors.postalCode} required />
            <span className="hidden sm:block" />
          </FieldRow>
        </FormSection>

        <FormSection title="Identity verification">
          <FileField
            label="Government-issued ID"
            accept="image/jpeg,image/png,image/webp"
            file={idDocument}
            onChange={setIdDocument}
            error={errors.idDocument}
            hint="Stored privately and visible only to Marketo administrators during review."
            required
          />
        </FormSection>

        <FormSection title="Security">
          <FieldRow>
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Create a strong password" error={errors.password} required />
            <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" error={errors.confirm} required />
          </FieldRow>
          <PasswordStrength password={password} />
        </FormSection>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
