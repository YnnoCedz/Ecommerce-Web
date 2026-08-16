import { useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { CATEGORY_LABELS } from "../../pub/data";

export type OnboardingView = "form" | "status";

interface SellerOnboardingProps {
  view?: OnboardingView;
}

const CATEGORIES = CATEGORY_LABELS;

const CERT_ACCEPT = "image/jpeg,image/png,application/pdf";
const CERT_MAX_BYTES = 10 * 1024 * 1024;

function validateCertificate(file: File): string | null {
  const okType = ["image/jpeg", "image/png", "application/pdf"].includes(file.type);
  if (!okType) return "Unsupported file type. Upload a JPEG, PNG, or PDF document.";
  if (file.size > CERT_MAX_BYTES) return "File is too large. Maximum size is 10 MB.";
  return null;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type LocationOption = { name: string; postal: string };

const BUSINESS_LOCATIONS: Record<string, LocationOption[]> = {
  "Metro Manila": [
    { name: "Quezon City", postal: "1100" },
    { name: "Manila", postal: "1000" },
    { name: "Makati", postal: "1200" },
    { name: "Pasig", postal: "1600" },
    { name: "Taguig", postal: "1630" },
  ],
  Cebu: [
    { name: "Cebu City", postal: "6000" },
    { name: "Mandaue City", postal: "6014" },
    { name: "Lapu-Lapu City", postal: "6015" },
  ],
  Cavite: [
    { name: "Bacoor", postal: "4102" },
    { name: "Imus", postal: "4103" },
    { name: "Dasmariñas", postal: "4114" },
  ],
  Laguna: [
    { name: "Santa Rosa", postal: "4026" },
    { name: "Calamba", postal: "4027" },
    { name: "Biñan", postal: "4024" },
  ],
  Rizal: [
    { name: "Antipolo", postal: "1870" },
    { name: "Cainta", postal: "1900" },
    { name: "Taytay", postal: "1920" },
  ],
  Bulacan: [
    { name: "Meycauayan", postal: "3020" },
    { name: "Malolos", postal: "3000" },
    { name: "San Jose del Monte", postal: "3023" },
  ],
  Pampanga: [
    { name: "San Fernando", postal: "2000" },
    { name: "Angeles", postal: "2009" },
    { name: "Mabalacat", postal: "2010" },
  ],
  "Davao del Sur": [
    { name: "Davao City", postal: "8000" },
    { name: "Digos", postal: "8002" },
  ],
};

const BUSINESS_REGIONS = Object.keys(BUSINESS_LOCATIONS);

const STEPS = [
  { n: 1 as Step, label: "Business Info" },
  { n: 2 as Step, label: "Categories" },
  { n: 3 as Step, label: "Store Info" },
  { n: 4 as Step, label: "Contact" },
  { n: 5 as Step, label: "Verification" },
  { n: 6 as Step, label: "Review" },
];

function StepProgress({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex items-center flex-1">
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
                {done ? "✓" : s.n}
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
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
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

export default function SellerOnboarding({ view = "form" }: SellerOnboardingProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [tin, setTin] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [establishedDate, setEstablishedDate] = useState("");
  const [businessAddress, setBusinessAddress] = useState({
    line1: "",
    line2: "",
    province: "",
    city: "",
    postal: "",
  });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [bizFile, setBizFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const idRef = useRef<HTMLInputElement>(null);
  const bizRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const selectedLocationOptions = businessAddress.province ? BUSINESS_LOCATIONS[businessAddress.province] ?? [] : [];

  const updateBusinessAddress = (key: keyof typeof businessAddress) => (value: string) => {
    setBusinessAddress(prev => {
      if (key === "province") {
        return { ...prev, province: value, city: "", postal: "" };
      }
      if (key === "city") {
        const nextPostal = (BUSINESS_LOCATIONS[prev.province] ?? []).find(loc => loc.name === value)?.postal ?? "";
        return { ...prev, city: value, postal: nextPostal };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleCertChange = (file: File | null) => {
    if (!file) {
      setCertFile(null);
      setCertError(null);
      return;
    }
    const err = validateCertificate(file);
    if (err) {
      setCertError(err);
      setCertFile(null);
    } else {
      setCertError(null);
      setCertFile(file);
    }
  };

  const handleSubmit = () => {
    if (
      businessName.trim() === "" ||
      ownerId.trim() === "" ||
      tin.trim() === "" ||
      registrationNo.trim() === "" ||
      establishedDate.trim() === ""
    ) {
      setSubmitError("Please complete the Business Info step before submitting.");
      setStep(1);
      return;
    }
    if (
      businessAddress.line1.trim() === "" ||
      businessAddress.province.trim() === "" ||
      businessAddress.city.trim() === "" ||
      businessAddress.postal.trim() === ""
    ) {
      setSubmitError("Please complete the business address fields before submitting.");
      setStep(1);
      return;
    }
    if (!certFile) {
      setSubmitError("Seller Certificate is required. Please upload it in the Verification step.");
      setStep(5);
      return;
    }
    if (!tosAgreed) {
      setSubmitError("Please accept the Seller Terms to submit your application.");
      return;
    }
    setSubmitError(null);
    setSubmitted(true);
  };

  const toggleCategory = (c: string) =>
    setSelectedCategories(prev => (prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 5 ? [...prev, c] : prev));

  if (view === "status") return <ApplicationStatus />;
  if (submitted) return <ApplicationStatus submitted />;

  return (
    <div className="min-h-screen bg-[var(--color-ground)] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link to="/" className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)] transition-colors">
            ← Back to marketplace
          </Link>
        </div>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
              <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-widest uppercase">Marketo Seller Center</span>
          </Link>
          <h1 className="font-[var(--font-display)] text-3xl font-[400] text-[var(--color-ink)] mb-2">Apply to sell on Marketo</h1>
          <p className="text-[var(--color-ink-muted)] text-sm max-w-md mx-auto">Reach millions of buyers across the Philippines. Complete your seller application to get started.</p>
        </div>

        <StepProgress current={step} />

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          {step === 1 && (
            <FormSection title="Business information" desc="All seller accounts are treated as for-profit, tax-registered businesses.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Registered business name" required>
                  <input
                    type="text"
                    placeholder="e.g. Maria's Crafts Inc."
                    className={INPUT_CLS}
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                  />
                </Field>
                <Field label="Trade name / DBA" hint="Leave blank if same as registered name">
                  <input
                    type="text"
                    placeholder="e.g. Maria's Crafts"
                    className={INPUT_CLS}
                    value={tradeName}
                    onChange={e => setTradeName(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Owner ID" required hint="Government ID or PhilSys number of the registered owner.">
                  <input
                    type="text"
                    value={ownerId}
                    onChange={e => setOwnerId(e.target.value)}
                    placeholder="e.g. 1234-5678-9012"
                    className={INPUT_CLS}
                  />
                  {ownerId.trim() === "" && <p className="text-xs text-[var(--color-ink-disabled)] mt-1">Required to verify the store owner's identity.</p>}
                </Field>
                <Field label="BIR TIN" required hint="9-digit Tax Identification Number">
                  <input
                    type="text"
                    placeholder="000-000-000"
                    className={INPUT_CLS}
                    value={tin}
                    onChange={e => setTin(e.target.value)}
                    maxLength={11}
                  />
                </Field>
              </div>

              <Field label="DTI / SEC registration no." required>
                <input
                  type="text"
                  placeholder="CS202600000"
                  className={INPUT_CLS}
                  value={registrationNo}
                  onChange={e => setRegistrationNo(e.target.value)}
                />
              </Field>

              <Field label="Date established" required>
                <input type="date" className={INPUT_CLS} value={establishedDate} onChange={e => setEstablishedDate(e.target.value)} />
              </Field>

              <div className="mt-6">
                <h4 className="text-sm font-[600] text-[var(--color-ink)] mb-1.5">Business address</h4>
                <p className="text-xs text-[var(--color-ink-muted)] mb-4">Use the same structured address format as your saved addresses.</p>

                <Field label="Address line 1" required>
                  <input
                    type="text"
                    placeholder="Street / Building / House no."
                    className={INPUT_CLS}
                    value={businessAddress.line1}
                    onChange={e => updateBusinessAddress("line1")(e.target.value)}
                  />
                </Field>

                <Field label="Address line 2 (optional)">
                  <input
                    type="text"
                    placeholder="Subdivision / Barangay"
                    className={INPUT_CLS}
                    value={businessAddress.line2}
                    onChange={e => updateBusinessAddress("line2")(e.target.value)}
                  />
                </Field>

                <Field label="Province / Region" required>
                  <select
                    value={businessAddress.province}
                    onChange={e => updateBusinessAddress("province")(e.target.value)}
                    className={INPUT_CLS + " cursor-pointer"}
                  >
                    <option value="">Select province / region</option>
                    {BUSINESS_REGIONS.map(region => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                  <Field label="City / Municipality" required>
                    <select
                      value={businessAddress.city}
                      onChange={e => updateBusinessAddress("city")(e.target.value)}
                      className={INPUT_CLS + " cursor-pointer"}
                      disabled={!businessAddress.province}
                    >
                      <option value="">{businessAddress.province ? "Select city / municipality" : "Select a province / region first"}</option>
                      {selectedLocationOptions.map(city => (
                        <option key={city.name} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Postal code" required>
                    <input
                      type="text"
                      value={businessAddress.postal}
                      readOnly
                      placeholder="Auto-filled"
                      className={`${INPUT_CLS} bg-[var(--color-surface)] text-[var(--color-ink-muted)]`}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>
          )}

          {step === 2 && (
            <FormSection title="Select your product categories" desc="Choose up to 5 categories that best describe what you sell. You can update these later.">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                {CATEGORIES.map(c => {
                  const sel = selectedCategories.includes(c);
                  const disabled = !sel && selectedCategories.length >= 5;
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCategory(c)}
                      disabled={disabled}
                      className={`px-3 py-2.5 text-xs font-[500] rounded-sm border text-left transition-all cursor-pointer ${
                        sel
                          ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)] text-[var(--color-navy)]"
                          : disabled
                            ? "border-[var(--color-border)] text-[var(--color-ink-disabled)] bg-[var(--color-surface)] cursor-not-allowed opacity-50"
                            : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:border-[var(--color-navy)]/50 hover:text-[var(--color-ink)]"
                      }`}
                    >
                      {sel && <span className="mr-1">✓</span>}
                      {c}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                <span className="text-xs text-[var(--color-ink-muted)]">{selectedCategories.length}/5 categories selected</span>
                {selectedCategories.length > 0 && <span className="ml-2 text-xs text-[var(--color-navy)]">{selectedCategories.join(" · ")}</span>}
              </div>
            </FormSection>
          )}

          {step === 3 && (
            <FormSection title="Set up your store" desc="Your store is your public face on Marketo. Choose a name that represents your brand.">
              <Field label="Store name" required hint="2-40 characters. Letters, numbers, and spaces only.">
                <input type="text" placeholder="e.g. Verde Botanics" className={INPUT_CLS} maxLength={40} />
              </Field>
              <Field label="Store URL slug" required hint="marketo.ph/store/your-slug - Only lowercase letters, numbers, and hyphens.">
                <div className="flex items-center border border-[var(--color-border)] rounded-sm bg-white focus-within:border-[var(--color-navy)] transition-colors overflow-hidden">
                  <span className="px-3 py-2.5 text-sm text-[var(--color-ink-disabled)] bg-[var(--color-surface)] border-r border-[var(--color-border)] whitespace-nowrap">marketo.ph/store/</span>
                  <input type="text" placeholder="verde-botanics" className="flex-1 px-3 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none bg-white font-[var(--font-body)]" />
                </div>
              </Field>
              <Field label="Store description" required hint="Describe your store in 30-500 characters. Visible to buyers on your store page.">
                <textarea rows={4} placeholder="Tell buyers what makes your store unique - your story, specialty, and what they can expect..." className={INPUT_CLS + " resize-none"} maxLength={500} />
              </Field>
              <Field label="Tagline" hint="Optional short phrase shown under your store name.">
                <input type="text" placeholder="e.g. Naturally rooted, beautifully made" className={INPUT_CLS} maxLength={80} />
              </Field>
            </FormSection>
          )}

          {step === 4 && (
            <FormSection title="Contact information" desc="How buyers and Marketo will reach you. Your personal contact is kept private from buyers.">
              <div className="grid grid-cols-2 gap-4">
                <Field label="First name" required>
                  <input type="text" className={INPUT_CLS} placeholder="Maria" />
                </Field>
                <Field label="Last name" required>
                  <input type="text" className={INPUT_CLS} placeholder="Santos" />
                </Field>
              </div>
              <Field label="Mobile number" required hint="Used for OTP verification and urgent notifications.">
                <div className="flex gap-2">
                  <select className="px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] bg-white focus:outline-none focus:border-[var(--color-navy)] w-24 font-[var(--font-body)]">
                    <option>+63</option>
                  </select>
                  <input type="tel" placeholder="917 000 0000" className={INPUT_CLS} />
                </div>
              </Field>
              <Field label="Email address" required hint="For order notifications, payouts, and seller communications.">
                <input type="email" placeholder="maria@yourbusiness.com" className={INPUT_CLS} />
              </Field>
              <Field label="Public store email" hint="Shown to buyers on your store page. Leave blank to hide.">
                <input type="email" placeholder="hello@yourbusiness.com" className={INPUT_CLS} />
              </Field>
              <Field label="Viber / WhatsApp number" hint="Optional. Used for buyer-initiated contact through your store.">
                <input type="tel" placeholder="+63 917 000 0000" className={INPUT_CLS} />
              </Field>
            </FormSection>
          )}

          {step === 5 && (
            <FormSection title="Identity and document verification" desc="Upload clear photos or scans of your documents. Accepted: JPEG, PNG, PDF. Max 10MB each.">
              <div className="mb-5">
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Government-issued ID <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">Passport, PhilSys ID, Driver's License, UMID, SSS ID, PRC ID, Voter's ID, or Postal ID. Both front and back in a single file or two uploads.</p>
                <input ref={idRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setIdFile(e.target.files?.[0] ?? null)} />
                {idFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="2" y="1" width="12" height="14" rx="1.5" />
                      <path d="M5 6h6M5 9h6M5 12h3" />
                    </svg>
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{idFile.name}</span>
                    <button onClick={() => setIdFile(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => idRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M12 3v12M7.5 8L12 3l4.5 5" />
                      <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                    </svg>
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload government ID</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG · PNG · PDF · max 10MB</span>
                  </button>
                )}
              </div>

              <div>
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Business registration document <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">DTI Certificate, SEC Certificate of Incorporation, Mayor's Permit, or equivalent.</p>
                <input ref={bizRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setBizFile(e.target.files?.[0] ?? null)} />
                {bizFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="2" y="1" width="12" height="14" rx="1.5" />
                      <path d="M5 6h6M5 9h6M5 12h3" />
                    </svg>
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{bizFile.name}</span>
                    <button onClick={() => setBizFile(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button onClick={() => bizRef.current?.click()} className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[var(--color-border)] rounded-sm hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M12 3v12M7.5 8L12 3l4.5 5" />
                      <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                    </svg>
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload business document</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG · PNG · PDF · max 10MB</span>
                  </button>
                )}
              </div>

              <div className="mt-5">
                <p className="text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Seller Certificate <span className="text-[var(--color-red)]">*</span>
                </p>
                <p className="text-xs text-[var(--color-ink-muted)] mb-3">Your seller accreditation or business permit certificate. Accepted: JPEG, PNG, PDF. Max 10MB. Kept private - visible only to you and Marketo administrators.</p>
                <input ref={certRef} type="file" accept={CERT_ACCEPT} className="hidden" onChange={e => handleCertChange(e.target.files?.[0] ?? null)} />
                {certFile ? (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-sm">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="2" y="1" width="12" height="14" rx="1.5" />
                      <path d="M5 6h6M5 9h6M5 12h3" />
                    </svg>
                    <span className="text-sm text-[var(--color-green)] flex-1 truncate">{certFile.name}</span>
                    <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-green)]/70 shrink-0">
                      {(certFile.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <button onClick={() => handleCertChange(null)} className="text-[var(--color-green)] hover:opacity-70 cursor-pointer text-xs">
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => certRef.current?.click()}
                    className={`w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed rounded-sm cursor-pointer transition-all ${
                      certError
                        ? "border-[var(--color-red-border)] bg-[var(--color-red-light)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-navy)] hover:bg-[var(--color-navy-surface)]"
                    }`}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M12 3v12M7.5 8L12 3l4.5 5" />
                      <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                    </svg>
                    <span className="text-sm text-[var(--color-ink-muted)]">Click to upload Seller Certificate</span>
                    <span className="text-xs text-[var(--color-ink-disabled)]">JPEG · PNG · PDF · max 10MB</span>
                  </button>
                )}
                {certError && (
                  <p className="flex items-center gap-1.5 text-xs text-[var(--color-red)] mt-2">
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="7" cy="7" r="5.5" />
                      <path d="M7 4v3.5M7 9.5v.5" />
                    </svg>
                    {certError}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-start gap-2.5 px-4 py-3 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-navy)" strokeWidth="1.5" strokeLinecap="round" className="shrink-0 mt-0.5">
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3M8 10v.5" />
                </svg>
                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">Your documents are encrypted and used only for identity verification in compliance with BSP and NPC regulations. They will not be shared with buyers.</p>
              </div>
            </FormSection>
          )}

          {step === 6 && (
            <FormSection title="Review your application" desc="Please review your information before submitting. You can still edit individual sections.">
              <div className="space-y-4">
                {[
                  { label: "Business name", value: businessName || "Verde Botanics Trading" },
                  { label: "Trade name", value: tradeName || "—" },
                  { label: "Owner ID", value: ownerId.trim() || "—" },
                  { label: "TIN", value: tin.trim() || "—" },
                  { label: "Registration no.", value: registrationNo.trim() || "—" },
                  { label: "Business address", value: businessAddress.line1 || "—" },
                  { label: "Address line 2", value: businessAddress.line2 || "—" },
                  { label: "Location", value: [businessAddress.city, businessAddress.province, businessAddress.postal].filter(Boolean).join(", ") || "—" },
                  { label: "Categories", value: selectedCategories.length > 0 ? selectedCategories.join(", ") : "Beauty & Personal Care, Home & Living" },
                  { label: "Store name", value: "Verde Botanics" },
                  { label: "Store URL", value: "marketo.ph/store/verde-botanics" },
                  { label: "Contact", value: "Maria Santos — +63 917 000 0000" },
                  { label: "Email", value: "maria@verdebotanics.com" },
                  { label: "ID verification", value: idFile?.name ?? "government-id.jpg" },
                  { label: "Business document", value: bizFile?.name ?? "dti-certificate.pdf" },
                  { label: "Seller Certificate", value: certFile?.name ?? "seller-certificate.pdf" },
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
                  I confirm that all information provided is accurate and I agree to the{" "}
                  <a href="#" className="text-[var(--color-navy)] hover:underline">
                    Seller Terms of Service
                  </a>
                  ,{" "}
                  <a href="#" className="text-[var(--color-navy)] hover:underline">
                    Privacy Policy
                  </a>
                  , and{" "}
                  <a href="#" className="text-[var(--color-navy)] hover:underline">
                    Merchant Code of Conduct
                  </a>
                  .
                </label>
              </div>
              {submitError && (
                <p className="flex items-center gap-1.5 text-xs text-[var(--color-red)] mt-3">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <circle cx="7" cy="7" r="5.5" />
                    <path d="M7 4v3.5M7 9.5v.5" />
                  </svg>
                  {submitError}
                </p>
              )}
            </FormSection>
          )}

          <div className="flex justify-between items-center mt-6 pt-5 border-t border-[var(--color-border)]">
            <button
              onClick={() => (step > 1 ? setStep((step - 1) as Step) : undefined)}
              className={`px-4 py-2.5 text-sm font-[500] rounded-sm border transition-colors cursor-pointer ${
                step === 1 ? "opacity-0 pointer-events-none" : "border-[var(--color-border)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface)]"
              }`}
            >
              ← Previous
            </button>
            <span className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">Step {step} of 6</span>
            {step < 6 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                className="px-5 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-[var(--color-amber)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer transition-all"
              >
                Submit Seller Application
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[var(--color-ink-disabled)] mt-6">
          Questions? Contact <a href="#" className="text-[var(--color-navy)] hover:underline">seller-support@marketo.ph</a>
        </p>
      </div>
    </div>
  );
}

function ApplicationStatus({ submitted = false }: { submitted?: boolean }) {
  const [status] = useState<"pending" | "approved" | "rejected">(submitted ? "pending" : "pending");

  return (
    <div className="min-h-screen bg-[var(--color-ground)] py-10 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[var(--color-amber)] rounded flex items-center justify-center">
              <span className="text-white font-[var(--font-display)] text-sm font-[400]">M</span>
            </div>
            <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink-muted)] tracking-widest uppercase">Marketo Seller Center</span>
          </div>
        </div>

        <div className="bg-white border border-[var(--color-border)] rounded-sm p-8 shadow-[0_2px_12px_rgba(28,27,24,0.06)]">
          {status === "pending" && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-amber-light)] border-2 border-[var(--color-amber-border)] flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" stroke="var(--color-amber)" strokeWidth="2" strokeLinecap="round">
                  <circle cx="16" cy="16" r="10" />
                  <path d="M16 10v6l3.5 3.5" />
                </svg>
              </div>
              <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest mb-2">Application submitted</p>
              <h2 className="font-[var(--font-display)] text-2xl font-[400] text-[var(--color-ink)] mb-2">Under review</h2>
              <p className="text-sm text-[var(--color-ink-muted)] mb-6">We're verifying your documents and business information. This usually takes 3-5 business days.</p>
              <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm p-4 text-left space-y-2 mb-6">
                {[
                  ["Reference number", "APP-2026-08-004821"],
                  ["Submitted", "Aug 15, 2026 at 2:34 PM"],
                  ["Status", "Under review"],
                  ["Estimated review", "Aug 18-20, 2026"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-sm">
                    <span className="text-[var(--color-ink-muted)]">{l}</span>
                    <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {["Documents submitted", "Identity verified", "Business information review", "Final approval"].map((s, i) => (
                  <div key={s} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        i < 2
                          ? "bg-[var(--color-green)] text-white"
                          : i === 2
                            ? "bg-[var(--color-amber)] text-white"
                            : "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-ink-disabled)]"
                      }`}
                    >
                      {i < 2 ? "✓" : i === 2 ? "⋯" : i + 1}
                    </div>
                    <span className={`text-sm ${i === 2 ? "font-[500] text-[var(--color-amber)]" : i < 2 ? "text-[var(--color-green)]" : "text-[var(--color-ink-disabled)]"}`}>{s}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Link to="/" className="flex-1 text-center py-2.5 border border-[var(--color-border)] text-sm font-[500] text-[var(--color-ink-muted)] rounded-sm hover:bg-[var(--color-surface)] transition-colors">
                  Back to marketplace
                </Link>
                <Link to="/account/dashboard" className="flex-1 text-center py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] transition-colors">
                  Go to my account
                </Link>
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-[var(--color-ink-disabled)] mt-4">
          Questions? <a href="mailto:seller-support@marketo.ph" className="text-[var(--color-navy)] hover:underline">seller-support@marketo.ph</a>
        </p>
      </div>
    </div>
  );
}
