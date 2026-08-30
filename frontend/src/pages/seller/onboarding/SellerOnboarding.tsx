import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATEGORY_LABELS } from "../../pub/data";
import {
  fetchCurrentSellerApplication,
  submitSellerApplication,
  type SellerApplicationSummary,
} from "../../../api/sellerApplications";
import { fetchCatalogCategories } from "../../../api/catalog";
import { ApiError } from "../../../api/client";
import PhilippineAddressSelector, { EMPTY_PHILIPPINE_ADDRESS } from "../../../components/PhilippineAddressSelector";

export type OnboardingView = "form" | "status";

interface SellerOnboardingProps {
  view?: OnboardingView;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type SellerApplicationForm = {
  firstName: string;
  lastName: string;
  businessName: string;
  tradeName: string;
  storeSlug: string;
  tagline: string;
  description: string;
  ownerIdNumber: string;
  tin: string;
  registrationNumber: string;
  establishedOn: string;
  addressLine1: string;
  addressLine2: string;
  region: string;
  regionCode: string;
  province: string;
  provinceCode: string;
  city: string;
  cityCode: string;
  barangay: string;
  barangayCode: string;
  postalCode: string;
  contactEmail: string;
  publicEmail: string;
  contactPhone: string;
  messagingPhone: string;
  mobilePrefix: string;
  mobileNumber: string;
};

const CATEGORIES = CATEGORY_LABELS;
const DOCUMENT_ACCEPT = "image/jpeg,image/png,application/pdf";
const FILE_MAX_BYTES = 10 * 1024 * 1024;

const STEPS: Array<{ n: Step; label: string }> = [
  { n: 1, label: "Business Info" },
  { n: 2, label: "Categories" },
  { n: 3, label: "Store Info" },
  { n: 4, label: "Contact" },
  { n: 5, label: "Verification" },
  { n: 6, label: "Review" },
];

const INITIAL_FORM: SellerApplicationForm = {
  firstName: "",
  lastName: "",
  businessName: "",
  tradeName: "",
  storeSlug: "",
  tagline: "",
  description: "",
  ownerIdNumber: "",
  tin: "",
  registrationNumber: "",
  establishedOn: "",
  addressLine1: "",
  addressLine2: "",
  region: "",
  regionCode: "",
  province: "",
  provinceCode: "",
  city: "",
  cityCode: "",
  barangay: "",
  barangayCode: "",
  postalCode: "",
  contactEmail: "",
  publicEmail: "",
  contactPhone: "",
  messagingPhone: "",
  mobilePrefix: "+63",
  mobileNumber: "",
};

function StepProgress({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, index) => {
        const done = step.n < current;
        const active = step.n === current;

        return (
          <div key={step.n} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-[var(--font-mono)] transition-all ${
                  done
                    ? "bg-[var(--color-green)] text-white"
                    : active
                      ? "bg-[var(--color-navy)] text-white ring-4 ring-[var(--color-navy)]/20"
                      : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-disabled)]"
                }`}
              >
                {done ? "OK" : step.n}
              </div>
              <span
                className={`text-[10px] font-[var(--font-mono)] whitespace-nowrap hidden sm:block ${
                  active
                    ? "text-[var(--color-navy)] font-[500]"
                    : done
                      ? "text-[var(--color-green)]"
                      : "text-[var(--color-ink-disabled)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${done ? "bg-[var(--color-green)]" : "bg-[var(--color-border)]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormSection({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-base font-[600] text-[var(--color-ink)] mb-0.5">{title}</h3>
      {desc && <p className="text-sm text-[var(--color-ink-muted)] mb-4">{desc}</p>}
      {!desc && <div className="mb-4" />}
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">
        {label} {required && <span className="text-[var(--color-red)]">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--color-ink-muted)] mt-1">{hint}</p>}
    </div>
  );
}

const INPUT_CLS =
  "w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] bg-white transition-colors font-[var(--font-body)]";

function validateDocumentFile(file: File | null): string | null {
  if (!file) return null;
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
    return "Unsupported file type. Upload a JPEG, PNG, or PDF document.";
  }
  if (file.size > FILE_MAX_BYTES) {
    return "File is too large. Maximum size is 10 MB.";
  }
  return null;
}

function formatApplicationNumber(id: number): string {
  return `APP-${String(id).padStart(6, "0")}`;
}

export default function SellerOnboarding({ view = "form" }: SellerOnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<SellerApplicationForm>(INITIAL_FORM);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<Record<string, number>>({});
  const [ownerIdFile, setOwnerIdFile] = useState<File | null>(null);
  const [businessDocumentFile, setBusinessDocumentFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateError, setCertificateError] = useState<string | null>(null);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState<SellerApplicationSummary | null>(null);

  const ownerIdRef = useRef<HTMLInputElement>(null);
  const businessDocRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    fetchCatalogCategories()
      .then(response => {
        if (!active) return;
        const nextIds: Record<string, number> = {};
        response.data.forEach(category => {
          nextIds[category.label] = category.id;
        });
        setCategoryIds(nextIds);
      })
      .catch(() => {
        // Fallback to the locally displayed labels if the catalog endpoint is temporarily unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const updateForm = <K extends keyof SellerApplicationForm>(key: K, value: SellerApplicationForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const setMobileNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    updateForm("mobileNumber", digits);
  };

  const setCertificate = (file: File | null) => {
    if (!file) {
      setCertificateFile(null);
      setCertificateError(null);
      return;
    }

    const error = validateDocumentFile(file);
    if (error) {
      setCertificateError(error);
      setCertificateFile(null);
      return;
    }

    setCertificateError(null);
    setCertificateFile(file);
  };

  const validationError = (currentStep: Step): string | null => {
    switch (currentStep) {
      case 1:
        if (!form.firstName.trim() || !form.lastName.trim() || !form.businessName.trim() || !form.ownerIdNumber.trim() || !form.tin.trim() || !form.registrationNumber.trim() || !form.establishedOn.trim()) {
          return "Please complete the Business Info step before continuing.";
        }
        if (!form.addressLine1.trim() || !form.regionCode || !form.cityCode || !form.barangayCode || !form.postalCode.trim()) {
          return "Please complete the business address fields before continuing.";
        }
        return null;
      case 2:
        return selectedCategories.length > 0 ? null : "Please choose at least one category.";
      case 3:
        if (!form.businessName.trim() || !form.description.trim() || !form.storeSlug.trim()) {
          return "Please complete the store information before continuing.";
        }
        return null;
      case 4:
        if (!form.firstName.trim() || !form.lastName.trim() || !form.mobileNumber.trim() || !form.contactEmail.trim()) {
          return "Please complete the contact information before continuing.";
        }
        return null;
      case 5:
        if (!ownerIdFile) return "Government-issued ID is required.";
        if (!certificateFile) return "Seller Certificate is required.";
        if (certificateError) return certificateError;
        return null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const error = validationError(step);
    if (error) {
      setSubmitError(error);
      return;
    }

    setSubmitError(null);
    setStep(prev => (prev < 6 ? ((prev + 1) as Step) : prev));
  };

  const goBack = () => {
    setSubmitError(null);
    setStep(prev => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleSubmit = async () => {
    const error = validationError(1) ?? validationError(2) ?? validationError(3) ?? validationError(4) ?? validationError(5);
    if (error) {
      setSubmitError(error);
      return;
    }

    if (!ownerIdFile || !certificateFile) {
      setSubmitError("Required documents are missing.");
      return;
    }

    if (!tosAgreed) {
      setSubmitError("Please accept the Seller Terms to submit your application.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await submitSellerApplication({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        business_name: form.businessName.trim(),
        trade_name: form.tradeName.trim() || undefined,
        tagline: form.tagline.trim() || undefined,
        description: form.description.trim(),
        owner_id_number: form.ownerIdNumber.trim(),
        tin: form.tin.trim(),
        registration_number: form.registrationNumber.trim(),
        established_on: form.establishedOn,
        address_line1: form.addressLine1.trim(),
        address_line2: form.addressLine2.trim() || undefined,
        region_code: form.regionCode,
        province_code: form.provinceCode || undefined,
        city_code: form.cityCode,
        barangay_code: form.barangayCode,
        postal_code: form.postalCode.trim(),
        contact_email: form.contactEmail.trim(),
        public_email: form.publicEmail.trim() || undefined,
        contact_phone: `${form.mobilePrefix}${form.mobileNumber.trim()}`,
        messaging_phone: form.messagingPhone.trim() || undefined,
        categories: selectedCategories
          .map(categoryName => categoryIds[categoryName] ?? (CATEGORIES.indexOf(categoryName) >= 0 ? CATEGORIES.indexOf(categoryName) + 1 : 0))
          .filter((id): id is number => id > 0),
        owner_id_file: ownerIdFile,
        seller_certificate_file: certificateFile,
        business_document_file: businessDocumentFile,
      });

      setSubmittedApplication(response.application);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to submit your seller application right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "status" || submittedApplication) {
    return <ApplicationStatus initialApplication={submittedApplication} />;
  }

  return (
    <div className="min-h-screen bg-[var(--color-ground)] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] transition-colors">
            {"<"} Back to marketplace
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
              <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-widest uppercase">
              Maketo Seller Center
            </span>
          </Link>
          <h1 className="font-[var(--font-display)] text-3xl font-[400] text-[var(--color-ink)] mb-2">Apply to sell on Maketo</h1>
          <p className="text-[var(--color-ink-muted)] text-sm max-w-md mx-auto">
            Reach millions of buyers across the Philippines. Complete your seller application to get started.
          </p>
        </div>

        <StepProgress current={step} />

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          {step === 1 && (
            <FormSection title="Business information" desc="All seller accounts are treated as for-profit, tax-registered businesses.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" required>
                  <input value={form.firstName} onChange={e => updateForm("firstName", e.target.value)} type="text" placeholder="Maria" className={INPUT_CLS} />
                </Field>
                <Field label="Last name" required>
                  <input value={form.lastName} onChange={e => updateForm("lastName", e.target.value)} type="text" placeholder="Santos" className={INPUT_CLS} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Registered business name" required>
                  <input
                    type="text"
                    placeholder="e.g. Maria's Crafts Inc."
                    className={INPUT_CLS}
                    value={form.businessName}
                    onChange={e => updateForm("businessName", e.target.value)}
                  />
                </Field>
                <Field label="Trade name / DBA" hint="Leave blank if same as registered name">
                  <input
                    type="text"
                    placeholder="e.g. Maria's Crafts"
                    className={INPUT_CLS}
                    value={form.tradeName}
                    onChange={e => updateForm("tradeName", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Owner ID" required hint="Government ID or PhilSys number of the registered owner.">
                <input
                  type="text"
                  value={form.ownerIdNumber}
                  onChange={e => updateForm("ownerIdNumber", e.target.value)}
                  placeholder="e.g. 1234-5678-9012"
                  className={INPUT_CLS}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="BIR TIN" required hint="Tax Identification Number">
                  <input
                    type="text"
                    placeholder="000-000-000"
                    className={INPUT_CLS}
                    value={form.tin}
                    onChange={e => updateForm("tin", e.target.value)}
                    maxLength={15}
                  />
                </Field>
                <Field label="DTI / SEC registration no." required>
                  <input
                    type="text"
                    placeholder="CS202600000"
                    className={INPUT_CLS}
                    value={form.registrationNumber}
                    onChange={e => updateForm("registrationNumber", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Date established" required>
                <input type="date" className={INPUT_CLS} value={form.establishedOn} onChange={e => updateForm("establishedOn", e.target.value)} />
              </Field>

              <div className="mt-6">
                <h4 className="text-sm font-[600] text-[var(--color-ink)] mb-1.5">Business address</h4>
                <p className="text-xs text-[var(--color-ink-muted)] mb-4">Use the same structured address format as your saved addresses.</p>

                <Field label="Address line 1" required>
                  <input
                    type="text"
                    placeholder="Street / Building / House no."
                    className={INPUT_CLS}
                    value={form.addressLine1}
                    onChange={e => updateForm("addressLine1", e.target.value)}
                  />
                </Field>

                <Field label="Address line 2 (optional)">
                  <input
                    type="text"
                    placeholder="Subdivision / Barangay"
                    className={INPUT_CLS}
                    value={form.addressLine2}
                    onChange={e => updateForm("addressLine2", e.target.value)}
                  />
                </Field>

                <PhilippineAddressSelector
                  value={{
                    ...EMPTY_PHILIPPINE_ADDRESS,
                    region: form.region,
                    region_code: form.regionCode,
                    province: form.province,
                    province_code: form.provinceCode,
                    city: form.city,
                    city_code: form.cityCode,
                    barangay: form.barangay,
                    barangay_code: form.barangayCode,
                    postal_code: form.postalCode,
                  }}
                  onChange={location => setForm(previous => ({
                    ...previous,
                    region: location.region,
                    regionCode: location.region_code,
                    province: location.province,
                    provinceCode: location.province_code,
                    city: location.city,
                    cityCode: location.city_code,
                    barangay: location.barangay,
                    barangayCode: location.barangay_code,
                    postalCode: location.postal_code,
                  }))}
                  disabled={isSubmitting}
                />

                <div className="mt-4 max-w-[220px]">
                  <Field label="Postal code" required>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={event => updateForm("postalCode", event.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="4-digit postal code"
                      className={INPUT_CLS}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>
          )}

          {step === 2 && (
            <FormSection title="Select your product categories" desc="Choose up to 5 categories that best describe what you sell. You can update these later.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {CATEGORIES.map((category) => {
                  const categoryLabel = typeof category === "string" ? category : category.label;
                  const selected = selectedCategories.includes(categoryLabel);
                  const disabled = !selected && selectedCategories.length >= 5;

                  return (
                    <button
                      key={categoryLabel}
                      onClick={() =>
                        setSelectedCategories(prev =>
                          prev.includes(categoryLabel)
                            ? prev.filter(value => value !== categoryLabel)
                            : prev.length < 5
                              ? [...prev, categoryLabel]
                              : prev,
                        )
                      }
                      disabled={disabled}
                      className={`px-3 py-2.5 text-xs font-[500] rounded-sm border text-left transition-all cursor-pointer ${
                        selected
                          ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)]"
                          : disabled
                            ? "border-[var(--color-border)] text-[var(--color-ink-disabled)] bg-[var(--color-surface)] cursor-not-allowed opacity-50"
                            : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)]/50 hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {selected && <span className="mr-1">OK</span>}
                      {categoryLabel}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                <span className="text-xs text-[var(--color-ink-muted)]">{selectedCategories.length}/5 categories selected</span>
                {selectedCategories.length > 0 && <span className="ml-2 text-xs text-[var(--color-navy)]">{selectedCategories.join(" | ")}</span>}
              </div>
            </FormSection>
          )}

          {step === 3 && (
            <FormSection title="Set up your store" desc="Your store is your public face on Maketo. Choose a name that represents your brand.">
              <Field label="Store name" required hint="2-40 characters. Letters, numbers, and spaces only.">
                <input type="text" placeholder="e.g. Verde Botanics" className={INPUT_CLS} maxLength={40} value={form.businessName} onChange={e => updateForm("businessName", e.target.value)} />
              </Field>
              <Field label="Store URL slug" required hint="maketo.ph/store/your-slug - Only lowercase letters, numbers, and hyphens.">
                <div className="flex items-center border border-[var(--color-border)] rounded-sm bg-white focus-within:border-[var(--color-navy)] transition-colors overflow-hidden">
                  <span className="px-3 py-2.5 text-sm text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border-r border-[var(--color-border)] whitespace-nowrap">maketo.ph/store/</span>
                  <input type="text" placeholder="verde-botanics" className="flex-1 px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none bg-white font-[var(--font-body)]" value={form.storeSlug} onChange={e => updateForm("storeSlug", e.target.value)} />
                </div>
              </Field>
              <Field label="Store description" required hint="Describe your store in 30-500 characters. Visible to buyers on your store page.">
                <textarea rows={4} placeholder="Tell buyers what makes your store unique - your story, specialty, and what they can expect..." className={INPUT_CLS + " resize-none"} maxLength={500} value={form.description} onChange={e => updateForm("description", e.target.value)} />
              </Field>
              <Field label="Tagline" hint="Optional short phrase shown under your store name.">
                <input type="text" placeholder="e.g. Naturally rooted, beautifully made" className={INPUT_CLS} maxLength={80} value={form.tagline} onChange={e => updateForm("tagline", e.target.value)} />
              </Field>
            </FormSection>
          )}

          {step === 4 && (
            <FormSection title="Contact information" desc="How buyers and Maketo will reach you. Your personal contact is kept private from buyers.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" required>
                  <input type="text" className={INPUT_CLS} placeholder="Maria" value={form.firstName} onChange={e => updateForm("firstName", e.target.value)} />
                </Field>
                <Field label="Last name" required>
                  <input type="text" className={INPUT_CLS} placeholder="Santos" value={form.lastName} onChange={e => updateForm("lastName", e.target.value)} />
                </Field>
              </div>
              <Field label="Mobile number" required hint="Used for OTP verification and urgent notifications.">
                <div className="flex gap-2">
                  <select
                    className="px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] w-24 font-[var(--font-body)]"
                    value={form.mobilePrefix}
                    onChange={e => updateForm("mobilePrefix", e.target.value)}
                  >
                    <option value="+63">+63</option>
                  </select>
                  <input type="tel" value={form.mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="9170000000" className={INPUT_CLS} maxLength={10} />
                </div>
              </Field>
              <Field label="Email address" required hint="For order notifications, payouts, and seller communications.">
                <input type="email" placeholder="maria@yourbusiness.com" className={INPUT_CLS} value={form.contactEmail} onChange={e => updateForm("contactEmail", e.target.value)} />
              </Field>
              <Field label="Public store email" hint="Shown to buyers on your store page. Leave blank to hide.">
                <input type="email" placeholder="hello@yourbusiness.com" className={INPUT_CLS} value={form.publicEmail} onChange={e => updateForm("publicEmail", e.target.value)} />
              </Field>
              <Field label="Viber / WhatsApp number" hint="Optional. Used for buyer-initiated contact through your store.">
                <input type="tel" placeholder="+63 917 000 0000" className={INPUT_CLS} value={form.messagingPhone} onChange={e => updateForm("messagingPhone", e.target.value)} />
              </Field>
            </FormSection>
          )}

          {step === 5 && (
            <FormSection title="Identity and document verification" desc="Upload clear photos or scans of your documents. Accepted: JPEG, PNG, PDF. Max 10MB each.">
              <div className="mb-5">
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Government-issued ID <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  Passport, PhilSys ID, Driver's License, UMID, SSS ID, PRC ID, Voter's ID, or Postal ID.
                </p>
                <input ref={ownerIdRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={e => setOwnerIdFile(e.target.files?.[0] ?? null)} />
                {ownerIdFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{ownerIdFile.name}</span>
                    <button onClick={() => setOwnerIdFile(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => ownerIdRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload government ID</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG / PNG / PDF / max 10MB</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Business registration document <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">DTI Certificate, SEC Certificate of Incorporation, Mayor's Permit, or equivalent.</p>
                <input ref={businessDocRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={e => setBusinessDocumentFile(e.target.files?.[0] ?? null)} />
                {businessDocumentFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{businessDocumentFile.name}</span>
                    <button onClick={() => setBusinessDocumentFile(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => businessDocRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload business document</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG / PNG / PDF / max 10MB</span>
                  </button>
                )}
              </div>

              <div className="mt-5">
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Seller Certificate <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">
                  Your seller accreditation or business permit certificate. Kept private and visible only to you and Maketo administrators.
                </p>
                <input ref={certRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={e => setCertificate(e.target.files?.[0] ?? null)} />
                {certificateFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{certificateFile.name}</span>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-green)]/70 shrink-0">
                      {(certificateFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button onClick={() => setCertificate(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => certRef.current?.click()}
                    className={`w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed rounded-sm cursor-pointer transition-all ${
                      certificateError
                        ? "border-[var(--color-red-border)] bg-[var(--color-red-light)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]"
                    }`}
                  >
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload Seller Certificate</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG / PNG / PDF / max 10MB</span>
                  </button>
                )}
                {certificateError && <p className="text-xs text-[var(--color-red)] mt-2">{certificateError}</p>}
              </div>
            </FormSection>
          )}

          {step === 6 && (
            <FormSection title="Review your application" desc="Please review your information before submitting. You can still edit individual sections.">
              <div className="space-y-4">
                {[
                  { label: "First name", value: form.firstName || "Maria" },
                  { label: "Last name", value: form.lastName || "Santos" },
                  { label: "Business name", value: form.businessName || "Verde Botanics Trading" },
                  { label: "Trade name", value: form.tradeName || "None" },
                  { label: "Store slug", value: form.storeSlug || "none" },
                  { label: "Owner ID", value: form.ownerIdNumber || "-" },
                  { label: "TIN", value: form.tin || "-" },
                  { label: "Registration no.", value: form.registrationNumber || "-" },
                  { label: "Business address", value: form.addressLine1 || "-" },
                  { label: "Address line 2", value: form.addressLine2 || "-" },
                  { label: "Location", value: [form.city, form.province, form.postalCode].filter(Boolean).join(", ") || "-" },
                  { label: "Categories", value: selectedCategories.length > 0 ? selectedCategories.join(", ") : "None selected" },
                  { label: "Contact", value: `${form.firstName || "Maria"} ${form.lastName || "Santos"} - ${form.mobilePrefix}${form.mobileNumber || "9170000000"}` },
                  { label: "Email", value: form.contactEmail || "maria@yourbusiness.com" },
                  { label: "Government ID", value: ownerIdFile?.name || "not uploaded" },
                  { label: "Business document", value: businessDocumentFile?.name || "not uploaded" },
                  { label: "Seller Certificate", value: certificateFile?.name || "not uploaded" },
                ].map(row => (
                  <div key={row.label} className="flex gap-4 py-2 border-b border-[var(--color-border-subtle)] last:border-0">
                    <span className="w-36 shrink-0 text-sm text-[var(--color-ink-muted)]">{row.label}</span>
                    <span className="text-sm text-[var(--color-ink)] font-[500] flex-1">{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-start gap-2.5">
                <input type="checkbox" id="tos-agree" checked={tosAgreed} onChange={e => setTosAgreed(e.target.checked)} className="mt-0.5 accent-[var(--color-navy)]" />
                <label htmlFor="tos-agree" className="text-sm text-[var(--color-ink-muted)] cursor-pointer leading-relaxed">
                  I confirm that all information provided is accurate and I agree to the Seller Terms of Service, Privacy Policy, and Merchant Code of Conduct.
                </label>
              </div>
            </FormSection>
          )}

          {submitError && (
            <p className="flex items-center gap-1.5 text-xs text-[var(--color-red)] mt-3">
              {submitError}
            </p>
          )}

          <div className="flex justify-between items-center mt-6 pt-5 border-t border-[var(--color-border)]">
            <button
              onClick={goBack}
              className={`px-4 py-2.5 text-sm font-[500] rounded-sm border transition-colors cursor-pointer ${
                step === 1 ? "opacity-0 pointer-events-none" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
              }`}
            >
              {"<"} Previous
            </button>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">Step {step} of 6</span>
            {step < 6 ? (
              <button
                onClick={goNext}
                className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors"
              >
                Continue {"->"}
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer transition-all disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit Seller Application"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-ink-disabled)] mt-6">
          Questions? Contact <a href="mailto:seller-support@maketo.ph" className="text-[var(--color-navy)] hover:underline">seller-support@maketo.ph</a>
        </p>
      </div>
    </div>
  );
}

function ApplicationStatus({ initialApplication }: { initialApplication: SellerApplicationSummary | null }) {
  const [application, setApplication] = useState<SellerApplicationSummary | null>(initialApplication);
  const [loading, setLoading] = useState(!initialApplication);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialApplication) {
      setApplication(initialApplication);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    fetchCurrentSellerApplication()
      .then(response => {
        if (active) setApplication(response.data);
      })
      .catch(err => {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Unable to load your seller application.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [initialApplication]);

  return (
    <div className="min-h-screen bg-[var(--color-ground)] py-10 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
              <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-widest uppercase">
              Maketo Seller Center
            </span>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          {loading && (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--color-ink-muted)]">Loading your seller application...</p>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--color-red)] mb-4">{error}</p>
              <Link to="/seller-center/onboarding" className="inline-flex px-4 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm">
                Start seller application
              </Link>
            </div>
          )}

          {!loading && !error && !application && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-4">
                <span className="text-[var(--color-ink-disabled)] text-2xl">-</span>
              </div>
              <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">No application found</h2>
              <p className="text-sm text-[var(--color-ink-muted)] mb-6">
                You have not submitted a seller application yet.
              </p>
              <div className="flex gap-2">
                <Link to="/" className="flex-1 text-center py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] transition-colors">
                  Back to marketplace
                </Link>
                <Link to="/seller-center/onboarding" className="flex-1 text-center py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">
                  Become a seller
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && application && (
            (() => {
              const status = application.status;
              const isApproved = status === "approved";
              const isRejected = status === "rejected";
              const isPending = status === "pending" || status === "reviewing" || status === "flagged";

              return (
                <div className="text-center">
                  <div
                    className={`w-16 h-16 rounded-full border-2 flex items-center justify-center mx-auto mb-4 ${
                      isApproved
                        ? "bg-[var(--color-green-light)] border-[var(--color-green-border)]"
                        : isRejected
                          ? "bg-[var(--color-red-light)] border-[var(--color-red-border)]"
                          : "bg-[var(--color-amber-light)] border-[var(--color-amber-border)]"
                    }`}
                  >
                    <span className="text-2xl">{isApproved ? "OK" : isRejected ? "!" : "~"}</span>
                  </div>

                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">
                    {isApproved ? "Application approved" : isRejected ? "Application rejected" : "Application submitted"}
                  </p>
                  <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">
                    {isApproved ? "Seller account activated" : isRejected ? "Review completed" : "Under review"}
                  </h2>
                  <p className="text-sm text-[var(--color-ink-muted)] mb-6">
                    {isApproved
                      ? "Your seller profile is now active and you can access the seller dashboard."
                      : isRejected
                        ? "Your application was not approved. You can update the details and submit again."
                        : "We are verifying your documents and business information. This usually takes 3-5 business days."}
                  </p>

                  <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 text-left space-y-2 mb-6">
                    {[
                      ["Reference number", formatApplicationNumber(application.id)],
                      ["Business name", application.business_name],
                      ["Submitted", application.submitted_at ? new Date(application.submitted_at).toLocaleString() : "-"],
                      ["Status", application.status],
                      ["Reviewed by", application.reviewed_by ?? "-"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-[var(--color-ink-muted)]">{label}</span>
                        <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {application.categories.length > 0 && (
                    <div className="mb-6 text-left">
                      <p className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Selected categories</p>
                      <p className="text-sm text-[var(--color-ink)]">{application.categories.map(category => category.name).join(", ")}</p>
                    </div>
                  )}

                  {isPending && (
                    <div className="space-y-3">
                      {["Documents submitted", "Identity verified", "Business information review", "Final approval"].map((label, index) => (
                        <div key={label} className="flex items-center gap-3 text-left">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${index < 2 ? "bg-[var(--color-green)] text-white" : index === 2 ? "bg-[var(--color-amber)] text-white" : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-disabled)]"}`}>
                            {index < 2 ? "OK" : index === 2 ? "..." : String(index + 1)}
                          </div>
                          <span className={`text-sm ${index === 2 ? "font-[500] text-[var(--color-amber)]" : index < 2 ? "text-[var(--color-green)]" : "text-[var(--color-ink-disabled)]"}`}>
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {isRejected && application.rejection_reason && (
                    <div className="px-3 py-3 bg-[var(--color-red-light)] border border-[var(--color-red-border)] rounded-sm text-left mb-6">
                      <p className="text-xs text-[var(--color-red)] font-[500] mb-1">Rejection reason</p>
                      <p className="text-xs text-[var(--color-ink)]">{application.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2 mt-6">
                    <Link to="/" className="flex-1 text-center py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] transition-colors">
                      Back to marketplace
                    </Link>
                    {isApproved ? (
                      <Link to="/seller-center" className="flex-1 text-center py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">
                        Go to seller dashboard
                      </Link>
                    ) : (
                      <Link to="/seller-center/onboarding" className="flex-1 text-center py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">
                        Update application
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>

        <p className="text-center text-xs text-[var(--color-ink-disabled)] mt-4">
          Questions? <a href="mailto:seller-support@maketo.ph" className="text-[var(--color-navy)] hover:underline">seller-support@maketo.ph</a>
        </p>
      </div>
    </div>
  );
}
