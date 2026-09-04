import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router"
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
import AuthLayout, { Field, PasswordStrength, AuthAlert } from "./AuthLayout"

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

function Select({
  label,
  value,
  onChange,
  options,
  error,
  disabled,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  error?: string
  disabled?: boolean
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
        {label}
        {required && <span className="text-[var(--color-red)] ml-0.5">*</span>}
      </label>
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className={`w-full px-3.5 py-2.5 text-sm rounded-sm border outline-none transition-all bg-white text-[var(--color-ink)] ${
          error
            ? "border-[var(--color-red)] focus:ring-2 focus:ring-[var(--color-red)]/15"
            : "border-[var(--color-border)] focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
        } disabled:bg-[var(--color-surface)] disabled:text-[var(--color-ink-muted)]`}
      >
        <option value="">{placeholder ?? "Select"}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs text-[var(--color-red)] mt-1.5">{error}</p>
      )}
    </div>
  )
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
      title="Create your Maketo account"
      subtitle="Verify your email, then a Maketo administrator reviews your registration before your account is activated."
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

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName} placeholder="Ana" error={errors.firstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName} placeholder="Reyes" error={errors.lastName} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Middle name" value={middleName} onChange={setMiddleName} placeholder="Optional" error={errors.middleName} />
          <Select label="Sex" value={sex} onChange={setSex} options={SEXES} error={errors.sex} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Birthday" type="date" value={birthdate} onChange={setBirthdate} error={errors.birthdate} required />
          <div>
            <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
              Age
            </label>
            <input
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
        </div>

        <Field label="Email address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" error={errors.email} required />

        <div>
          <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
            Mobile number<span className="text-[var(--color-red)] ml-0.5">*</span>
          </label>
          <div
            className={`flex items-center rounded-sm border bg-white ${
              errors.phone
                ? "border-[var(--color-red)]"
                : "border-[var(--color-border)] focus-within:border-[var(--color-navy)]"
            }`}
          >
            <span className="px-3 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] py-2.5">
              +63
            </span>
            <input
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

        <div className="pt-1 border-t border-[var(--color-border)]">
          <p className="text-xs font-[600] text-[var(--color-ink)] pt-4 pb-1">
            Address
          </p>
        </div>

        <Select label="Region" value={regionCode} onChange={setRegionCode} options={toOptions(regions)} error={errors.regionCode} placeholder="Select region" required />

        {provinces.length > 0 && (
          <Select label="Province" value={provinceCode} onChange={setProvinceCode} options={toOptions(provinces)} error={errors.provinceCode} placeholder="Select province" required />
        )}

        <Select label="City / Municipality" value={cityCode} onChange={setCityCode} options={toOptions(cities)} error={errors.cityCode} placeholder="Select city or municipality" disabled={cities.length === 0} required />

        <Select label="Barangay" value={barangayCode} onChange={setBarangayCode} options={toOptions(barangays)} error={errors.barangayCode} placeholder="Select barangay" disabled={barangays.length === 0} required />

        <div className="grid grid-cols-2 gap-3">
          <Field label="House number" value={houseNumber} onChange={setHouseNumber} placeholder="12" />
          <Field label="Street" value={street} onChange={setStreet} placeholder="Mabini Street" error={errors.street} required />
        </div>

        <Field label="Postal code" value={postalCode} onChange={setPostalCode} placeholder="1100" error={errors.postalCode} required />

        <div>
          <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
            Government-issued ID<span className="text-[var(--color-red)] ml-0.5">*</span>
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => setIdDocument(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[var(--color-ink-muted)] file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border-0 file:text-xs file:font-[600] file:bg-[var(--color-surface)] file:text-[var(--color-navy)] cursor-pointer"
          />
          {errors.idDocument ? (
            <p className="text-xs text-[var(--color-red)] mt-1.5">{errors.idDocument}</p>
          ) : (
            <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">
              Stored privately and visible only to Maketo administrators during review.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Create a strong password" error={errors.password} required />
          <PasswordStrength password={password} />
          <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} placeholder="Re-enter your password" error={errors.confirm} required />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[var(--color-navy)] text-white text-sm font-[500] py-2.5 rounded-sm hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  )
}
