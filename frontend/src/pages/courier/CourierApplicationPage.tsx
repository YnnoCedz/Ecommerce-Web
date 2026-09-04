import { useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, FileImage, LoaderCircle, Upload, X } from "lucide-react"
import { Link } from "react-router"
import { ApiError } from "../../api/client"
import {
  fetchCurrentCourierApplication,
  saveCourierApplicationDraft,
  submitCourierApplication,
  type CourierApplication,
} from "../../api/courierApplications"
import { useAuth } from "../../auth/AuthContext"
import PhilippineAddressSelector, {
  EMPTY_PHILIPPINE_ADDRESS,
  type PhilippineAddressValue,
} from "../../components/PhilippineAddressSelector"
import PhilippinePhoneField from "../../components/PhilippinePhoneField"

const MAX_BYTES = 8 * 1024 * 1024
const ACCEPT = "image/jpeg,image/png,image/webp"
const STEPS = ["Contact", "Address", "Vehicle", "Documents", "Review"]

type DocumentKey = "driver_license_image" | "vehicle_or_image" | "vehicle_cr_image"
type FieldKey = "addressLine1" | "addressLine2" | "vehicleMake" | "vehicleModel" | "vehicleYear" | "plateNumber" | "vehicleColor"

type FormState = {
  mobile: string
  addressLine1: string
  addressLine2: string
  address: PhilippineAddressValue
  vehicleType: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: string
  plateNumber: string
  vehicleColor: string
  documents: Record<DocumentKey, File | null>
}

const initialForm = (mobile = ""): FormState => ({
  mobile,
  addressLine1: "",
  addressLine2: "",
  address: EMPTY_PHILIPPINE_ADDRESS,
  vehicleType: "motorcycle",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  plateNumber: "",
  vehicleColor: "",
  documents: {
    driver_license_image: null,
    vehicle_or_image: null,
    vehicle_cr_image: null,
  },
})

function PublicCourierLanding({ checking }: { checking: boolean }) {
  const returnTo = encodeURIComponent("/courier/apply")
  return (
    <main>
      <section className="border-b border-[var(--color-border)] bg-[var(--color-navy)] text-white">
        <div className="mx-auto max-w-screen-xl px-4 py-16 md:px-8 md:py-24">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-amber)]">
            Deliver with Marketo
          </p>
          <h1 className="mt-3 max-w-3xl font-[var(--font-display)] text-4xl leading-tight md:text-6xl">
            Become a Marketo Courier
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75">
            Use one Marketo account to apply to the delivery network. Courier
            access is enabled only after an administrator reviews and approves
            your application.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              aria-disabled={checking}
              to={`/auth/register?returnTo=${returnTo}`}
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-[var(--color-amber)] px-6 py-3 text-sm font-[700] text-[var(--color-navy)]"
            >
              Create Marketo Account
            </Link>
            <Link
              aria-disabled={checking}
              to={`/auth/login?returnTo=${returnTo}`}
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-white/50 px-6 py-3 text-sm font-[700] text-white hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-screen-xl gap-8 px-4 py-12 md:grid-cols-2 md:px-8 md:py-16">
        <div>
          <h2 className="font-[var(--font-display)] text-3xl text-[var(--color-ink)]">
            What you will need
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            {[
              "An active, email-verified Marketo account",
              "A Philippine mobile number and current address",
              "Motorcycle, car, or van details",
              "Clear images of your driver's license, vehicle OR, and vehicle CR",
            ].map((item) => (
              <li key={item} className="flex gap-3">
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-[var(--color-green)]"
                  size={18}
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border border-[var(--color-border)] bg-white p-6 shadow-sm">
          <h2 className="font-[var(--font-display)] text-2xl text-[var(--color-ink)]">
            Private by design
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">
            Application documents are stored privately and made available only
            through short-lived authorized access. Submitting an application
            does not grant courier permissions.
          </p>
        </div>
      </section>
    </main>
  )
}

function ImageUpload({
  id,
  label,
  file,
  error,
  disabled,
  onChange,
}: {
  id: DocumentKey
  label: string
  file: File | null
  error?: string
  disabled: boolean
  onChange: (file: File | null) => void
}) {
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  return (
    <div
      className={`rounded-sm border p-4 ${
        error ? "border-[var(--color-red)]" : "border-[var(--color-border)]"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <label htmlFor={id} className="text-sm font-[600]">
            {label} <span className="text-[var(--color-red)]">*</span>
          </label>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
            JPEG, PNG, or WEBP · up to 8 MB
          </p>
        </div>
        <FileImage
          size={18}
          className="shrink-0 text-[var(--color-navy)]"
          aria-hidden="true"
        />
      </div>
      {file ? (
        <div className="rounded-sm bg-[var(--color-surface)] p-3">
          <div className="flex items-center gap-3">
            {preview && (
              <img
                src={preview}
                alt="Selected document preview"
                className="h-14 w-14 rounded-sm object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-[600]">{file.name}</p>
              <p className="text-[10px] text-[var(--color-ink-muted)]">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <label
              htmlFor={id}
              className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-[var(--color-border)] px-3 text-xs font-[600]"
            >
              Replace
            </label>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="inline-flex min-h-11 items-center gap-1 px-3 text-xs font-[600] text-[var(--color-red)] disabled:opacity-50"
            >
              <X size={15} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-[var(--color-border-strong)] px-4 py-5 text-sm text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]"
        >
          <Upload size={16} aria-hidden="true" /> Select image
        </label>
      )}
      <input
        id={id}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {error && (
        <p className="mt-2 text-xs text-[var(--color-red)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function StatusView({ application }: { application: CourierApplication }) {
  const approved = application.status === "approved"
  const rejected = application.status === "rejected"
  const documentCount = application.documents.length
  return (
    <main className="mx-auto max-w-2xl px-4 py-12 md:px-8">
      <div className="rounded-sm border border-[var(--color-border)] bg-white p-6 shadow-sm md:p-8">
        <CheckCircle2
          size={42}
          className={
            approved
              ? "text-[var(--color-green)]"
              : rejected
                ? "text-[var(--color-red)]"
                : "text-[var(--color-amber)]"
          }
          aria-hidden="true"
        />
        <p className="mt-5 font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-ink-muted)]">
          {application.reference}
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-3xl">
          {approved
            ? "Courier Application Approved"
            : rejected
              ? "Courier Application Rejected"
              : "Courier Application Submitted"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-ink-muted)]">
          {approved
            ? "Your approved, active courier profile now grants courier capability. Your Marketo account role has not changed."
            : rejected
              ? "No courier access was granted. Your application remains securely on record."
              : "Your application is awaiting administrator review. Courier permissions remain disabled until approval."}
        </p>
        <dl className="mt-7 divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)] text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[var(--color-ink-muted)]">Status</dt>
            <dd className="font-[600] capitalize">{application.status}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[var(--color-ink-muted)]">Submitted</dt>
            <dd>
              {application.submitted_at
                ? new Date(application.submitted_at).toLocaleString("en-PH")
                : "Not submitted"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[var(--color-ink-muted)]">Vehicle</dt>
            <dd className="text-right">
              {application.vehicle.year} {application.vehicle.make}{" "}
              {application.vehicle.model}
              <br />
              <span className="font-[var(--font-mono)] text-xs">
                {application.vehicle.plate_number}
              </span>
            </dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-[var(--color-ink-muted)]">Documents</dt>
            <dd className="font-[600]">{documentCount}/3 received</dd>
          </div>
          {approved && (
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-[var(--color-ink-muted)]">Courier profile</dt>
              <dd className="font-[600] capitalize">
                {application.courier?.status ?? "active"}
              </dd>
            </div>
          )}
        </dl>
        {rejected && application.rejection_reason && (
          <div className="mt-5 rounded-sm bg-[var(--color-red-light)] p-4 text-sm text-[var(--color-red)]">
            <strong>Review reason:</strong> {application.rejection_reason}
          </div>
        )}
      </div>
    </main>
  )
}

export default function CourierApplicationPage() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [application, setApplication] = useState<CourierApplication | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftMessage, setDraftMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState<FormState>(() => initialForm())
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user || user.role === "admin") {
      setLoading(false)
      return
    }
    setForm((current) => ({
      ...current,
      mobile: current.mobile || user.phone || user.mobile || "",
    }))
    let active = true
    fetchCurrentCourierApplication()
      .then((response) => {
        if (!active) return
        setApplication(response.data)
        if (response.data?.status === "draft") {
          const draft = response.data
          setForm((current) => ({
            ...current,
            mobile: draft.mobile ?? current.mobile,
            addressLine1: draft.address.line1 ?? "",
            addressLine2: draft.address.line2 ?? "",
            address: {
              region_code: draft.address.region_code ?? "",
              region: draft.address.region ?? "",
              province_code: draft.address.province_code ?? "",
              province: draft.address.province ?? "",
              city_code: draft.address.city_code ?? "",
              city: draft.address.city ?? "",
              barangay_code: draft.address.barangay_code ?? "",
              barangay: draft.address.barangay ?? "",
              postal_code: draft.address.postal_code ?? "",
            },
            vehicleType: draft.vehicle.type ?? "motorcycle",
            vehicleMake: draft.vehicle.make ?? "",
            vehicleModel: draft.vehicle.model ?? "",
            vehicleYear: draft.vehicle.year ? String(draft.vehicle.year) : "",
            plateNumber: draft.vehicle.plate_number ?? "",
            vehicleColor: draft.vehicle.color ?? "",
          }))
        }
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to check your courier application.",
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [authLoading, user])

  useEffect(() => {
    if (step > 0) headingRef.current?.focus()
  }, [step])

  if (authLoading || !user)
    return <PublicCourierLanding checking={authLoading} />
  if (user.role === "admin")
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="border border-[var(--color-border)] bg-white p-8">
          <h1 className="font-[var(--font-display)] text-3xl">
            Courier registration is unavailable
          </h1>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            Administrator accounts cannot apply through the public courier flow.
          </p>
        </div>
      </main>
    )
  if (loading)
    return (
      <div className="mx-auto flex max-w-screen-xl items-center gap-2 px-4 py-16 text-sm text-[var(--color-ink-muted)]">
        <LoaderCircle className="animate-spin" size={18} /> Loading application
        status...
      </div>
    )
  if (application && application.status !== "draft")
    return <StatusView application={application} />

  const inputClass =
    "min-h-11 w-full rounded-sm border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-navy)] focus:ring-2 focus:ring-[var(--color-navy)]/10"
  const errorKey = (key: FieldKey) =>
    ({
      addressLine1: "address_line1",
      addressLine2: "address_line2",
      vehicleMake: "vehicle_make",
      vehicleModel: "vehicle_model",
      vehicleYear: "vehicle_year",
      plateNumber: "vehicle_plate_number",
      vehicleColor: "vehicle_color",
    })[key]
  const field = (
    label: string,
    key: FieldKey,
    required = true,
    type = "text",
  ) => {
    const apiKey = errorKey(key)
    return (
      <div>
        <label htmlFor={key} className="mb-1.5 block text-xs font-[600]">
          {label}
          {required && <span className="text-[var(--color-red)]"> *</span>}
        </label>
        <input
          id={key}
          type={type}
          value={form[key]}
          onChange={(event) =>
            setForm((current) => ({ ...current, [key]: event.target.value }))
          }
          className={inputClass}
          aria-invalid={Boolean(errors[apiKey])}
        />
        {errors[apiKey]?.[0] && (
          <p className="mt-1 text-xs text-[var(--color-red)]" role="alert">
            {errors[apiKey][0]}
          </p>
        )}
      </div>
    )
  }
  const changeFile = (key: DocumentKey, file: File | null) => {
    if (
      file &&
      (!ACCEPT.split(",").includes(file.type) || file.size > MAX_BYTES)
    ) {
      setErrors((current) => ({
        ...current,
        [key]: [
          file.size > MAX_BYTES
            ? "This image exceeds the 8 MB limit."
            : "Select a JPEG, PNG, or WEBP image.",
        ],
      }))
      return
    }
    setErrors((current) => ({ ...current, [key]: [] }))
    setForm((current) => ({
      ...current,
      documents: { ...current.documents, [key]: file },
    }))
  }
  const validate = (targetStep: number) => {
    const local: Record<string, string[]> = {}
    if (targetStep === 0 && !form.mobile)
      local.mobile = ["Mobile number is required."]
    if (targetStep === 1) {
      if (!form.addressLine1.trim())
        local.address_line1 = ["Street address is required."]
      if (!form.address.region_code) local.region_code = ["Region is required."]
      if (!form.address.city_code)
        local.city_code = ["City or municipality is required."]
      if (!form.address.barangay_code)
        local.barangay_code = ["Barangay is required."]
      if (!form.address.postal_code)
        local.postal_code = ["Postal code is required."]
    }
    if (targetStep === 2) {
      if (!form.vehicleMake.trim())
        local.vehicle_make = ["Vehicle make is required."]
      if (!form.vehicleModel.trim())
        local.vehicle_model = ["Vehicle model is required."]
      if (!form.vehicleYear) local.vehicle_year = ["Vehicle year is required."]
      if (!form.plateNumber.trim())
        local.vehicle_plate_number = ["Plate number is required."]
      if (!form.vehicleColor.trim())
        local.vehicle_color = ["Vehicle color is required."]
    }
    if (targetStep === 3)
      (Object.keys(form.documents) as DocumentKey[]).forEach((key) => {
        if (!form.documents[key]) local[key] = ["This document is required."]
      })
    setErrors((current) => ({ ...current, ...local }))
    return Object.keys(local).length === 0
  }
  const payload = () => ({
    mobile: form.mobile,
    address_line1: form.addressLine1.trim(),
    address_line2: form.addressLine2.trim() || undefined,
    region_code: form.address.region_code,
    province_code: form.address.province_code || undefined,
    city_code: form.address.city_code,
    barangay_code: form.address.barangay_code,
    postal_code: form.address.postal_code,
    vehicle_type: form.vehicleType,
    vehicle_make: form.vehicleMake.trim(),
    vehicle_model: form.vehicleModel.trim(),
    vehicle_year: Number(form.vehicleYear),
    vehicle_plate_number: form.plateNumber.trim(),
    vehicle_color: form.vehicleColor.trim(),
  })
  const saveDraft = async () => {
    setDraftSaving(true)
    setError(null)
    setDraftMessage(null)
    try {
      const response = await saveCourierApplicationDraft(payload())
      setApplication(response.data)
      setDraftMessage(
        "Draft saved. Document images are uploaded only when you submit.",
      )
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(caught.errors ?? {})
      setError(
        caught instanceof Error ? caught.message : "Unable to save your draft.",
      )
    } finally {
      setDraftSaving(false)
    }
  }
  const submit = async () => {
    if (![0, 1, 2, 3].every(validate)) {
      setError("Review the highlighted fields before submitting.")
      return
    }
    setSubmitting(true)
    setError(null)
    setErrors({})
    try {
      const response = await submitCourierApplication({
        ...payload(),
        driver_license_image: form.documents.driver_license_image!,
        vehicle_or_image: form.documents.vehicle_or_image!,
        vehicle_cr_image: form.documents.vehicle_cr_image!,
      })
      setApplication(response.data)
      await refreshUser()
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (caught) {
      if (caught instanceof ApiError) setErrors(caught.errors ?? {})
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit your courier application.",
      )
    } finally {
      setSubmitting(false)
    }
  }
  const next = () => {
    setError(null)
    if (validate(step))
      setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <div className="mb-7">
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--color-amber)]">
          Partner with Marketo
        </p>
        <h1 className="mt-2 font-[var(--font-display)] text-4xl">
          Courier application
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-ink-muted)]">
          Complete all five steps. You can save your non-document details and
          return later.
        </p>
      </div>
      <ol
        className="mb-8 grid grid-cols-5 gap-1"
        aria-label="Application progress"
      >
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={`border-t-4 pt-2 text-[10px] font-[600] sm:text-xs ${
              index <= step
                ? "border-[var(--color-amber)] text-[var(--color-ink)]"
                : "border-[var(--color-border)] text-[var(--color-ink-muted)]"
            }`}
          >
            <span className="hidden sm:inline">{index + 1}. </span>
            {label}
          </li>
        ))}
      </ol>
      {error && (
        <div
          className="mb-5 rounded-sm bg-[var(--color-red-light)] p-4 text-sm text-[var(--color-red)]"
          role="alert"
        >
          {error}
        </div>
      )}
      {draftMessage && (
        <div
          className="mb-5 rounded-sm bg-[var(--color-green-light)] p-4 text-sm text-[var(--color-green)]"
          role="status"
        >
          {draftMessage}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 4) void submit()
          else next()
        }}
      >
        <section className="rounded-sm border border-[var(--color-border)] bg-white p-5 md:p-7">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="font-[var(--font-display)] text-2xl outline-none"
          >
            {STEPS[step]}
          </h2>
          {step === 0 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-[600]">Name</label>
                <input
                  readOnly
                  value={user.display_name ?? ""}
                  className={`${inputClass} bg-[var(--color-surface)]`}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-[600]">Email</label>
                <input
                  readOnly
                  value={user.email}
                  className={`${inputClass} bg-[var(--color-surface)]`}
                />
              </div>
              <div className="sm:col-span-2">
                <PhilippinePhoneField
                  label="Mobile number *"
                  value={form.mobile}
                  onChange={(mobile) =>
                    setForm((current) => ({ ...current, mobile }))
                  }
                  error={errors.mobile?.[0]}
                  disabled={submitting}
                />
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {field("Street address", "addressLine1")}
              {field("Unit / building", "addressLine2", false)}
              <div className="sm:col-span-2">
                <PhilippineAddressSelector
                  value={form.address}
                  onChange={(address) =>
                    setForm((current) => ({ ...current, address }))
                  }
                  errors={errors}
                  disabled={submitting}
                />
              </div>
              <div>
                <label
                  htmlFor="postal_code"
                  className="mb-1.5 block text-xs font-[600]"
                >
                  Postal code *
                </label>
                <input
                  id="postal_code"
                  value={form.address.postal_code}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      address: {
                        ...current.address,
                        postal_code: event.target.value,
                      },
                    }))
                  }
                  className={inputClass}
                  aria-invalid={Boolean(errors.postal_code)}
                />
                {errors.postal_code?.[0] && (
                  <p
                    className="mt-1 text-xs text-[var(--color-red)]"
                    role="alert"
                  >
                    {errors.postal_code[0]}
                  </p>
                )}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="vehicleType"
                  className="mb-1.5 block text-xs font-[600]"
                >
                  Vehicle type *
                </label>
                <select
                  id="vehicleType"
                  value={form.vehicleType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vehicleType: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                </select>
              </div>
              {field("Make / brand", "vehicleMake")}
              {field("Model", "vehicleModel")}
              {field("Year", "vehicleYear", true, "number")}
              {field("Plate number", "plateNumber")}
              {field("Color", "vehicleColor")}
            </div>
          )}
          {step === 3 && (
            <>
              <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                Stored privately and available only through authorized,
                short-lived access.
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <ImageUpload
                  id="driver_license_image"
                  label="Driver's License"
                  file={form.documents.driver_license_image}
                  error={errors.driver_license_image?.[0]}
                  disabled={submitting}
                  onChange={(file) => changeFile("driver_license_image", file)}
                />
                <ImageUpload
                  id="vehicle_or_image"
                  label="Vehicle Official Receipt (OR)"
                  file={form.documents.vehicle_or_image}
                  error={errors.vehicle_or_image?.[0]}
                  disabled={submitting}
                  onChange={(file) => changeFile("vehicle_or_image", file)}
                />
                <ImageUpload
                  id="vehicle_cr_image"
                  label="Vehicle Certificate of Registration (CR)"
                  file={form.documents.vehicle_cr_image}
                  error={errors.vehicle_cr_image?.[0]}
                  disabled={submitting}
                  onChange={(file) => changeFile("vehicle_cr_image", file)}
                />
              </div>
            </>
          )}
          {step === 4 && (
            <div className="mt-5 space-y-5 text-sm">
              <div>
                <h3 className="font-[700]">Contact</h3>
                <p className="mt-1 text-[var(--color-ink-muted)]">
                  {user.display_name} · {user.email} · {form.mobile}
                </p>
              </div>
              <div>
                <h3 className="font-[700]">Address</h3>
                <p className="mt-1 text-[var(--color-ink-muted)]">
                  {form.addressLine1}
                  {form.addressLine2 ? `, ${form.addressLine2}` : ""},{" "}
                  {form.address.barangay}, {form.address.city},{" "}
                  {form.address.province || form.address.region}{" "}
                  {form.address.postal_code}
                </p>
              </div>
              <div>
                <h3 className="font-[700]">Vehicle</h3>
                <p className="mt-1 capitalize text-[var(--color-ink-muted)]">
                  {form.vehicleType} · {form.vehicleYear} {form.vehicleMake}{" "}
                  {form.vehicleModel} · {form.plateNumber} · {form.vehicleColor}
                </p>
              </div>
              <div>
                <h3 className="font-[700]">Documents</h3>
                <ul className="mt-1 space-y-1 text-[var(--color-ink-muted)]">
                  <li>
                    Driver's License:{" "}
                    {form.documents.driver_license_image?.name}
                  </li>
                  <li>Vehicle OR: {form.documents.vehicle_or_image?.name}</li>
                  <li>Vehicle CR: {form.documents.vehicle_cr_image?.name}</li>
                </ul>
              </div>
              <p className="rounded-sm bg-[var(--color-amber-light)] p-4 text-xs leading-5">
                Submitting creates a pending application only. Courier
                capability is granted only after admin approval activates your
                courier profile.
              </p>
            </div>
          )}
        </section>
        <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
          <button
            type="button"
            disabled={step === 0 || submitting}
            onClick={() => setStep((current) => current - 1)}
            className="min-h-11 rounded-sm border border-[var(--color-border)] px-5 text-sm font-[600] disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex flex-1 justify-end gap-2">
            <button
              type="button"
              disabled={submitting || draftSaving}
              onClick={() => void saveDraft()}
              className="min-h-11 rounded-sm border border-[var(--color-navy)] px-4 text-sm font-[600] text-[var(--color-navy)] disabled:opacity-60"
            >
              {draftSaving ? "Saving..." : "Save draft"}
            </button>
            <button
              type="submit"
              disabled={submitting || draftSaving}
              className="inline-flex min-h-11 min-w-32 items-center justify-center gap-2 rounded-sm bg-[var(--color-navy)] px-5 text-sm font-[600] text-white disabled:opacity-60"
            >
              {submitting && (
                <LoaderCircle size={16} className="animate-spin" />
              )}
              {step === 4
                ? submitting
                  ? "Submitting..."
                  : "Submit application"
                : "Continue"}
            </button>
          </div>
        </div>
      </form>
    </main>
  )
}
