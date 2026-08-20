import { useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  FileText,
  Info,
  X,
} from "lucide-react";

export type ReportTargetType = "seller" | "buyer" | "courier" | "product" | "conversation";

type ReportDialogProps = {
  targetType: ReportTargetType;
  targetName: string;
  onClose: () => void;
};

type ReportStep = "reason" | "details" | "confirm" | "success";

const REASONS: Record<ReportTargetType, { value: string; label: string; desc: string }[]> = {
  seller: [
    { value: "counterfeit",   label: "Counterfeit or fake products",      desc: "Products that are not authentic or misrepresented as genuine." },
    { value: "fraud",         label: "Fraudulent behavior",               desc: "Scams, deceptive pricing, non-delivery of goods." },
    { value: "misleading",    label: "Misleading listings",               desc: "Product descriptions or images that are inaccurate or deceptive." },
    { value: "harassment",    label: "Harassment or abuse",               desc: "Threatening, abusive, or inappropriate communication." },
    { value: "policy",        label: "Platform policy violation",         desc: "Selling prohibited items or breaking marketplace rules." },
    { value: "other",         label: "Other",                             desc: "Something not listed above." },
  ],
  buyer: [
    { value: "fraud",         label: "Fraudulent chargeback or dispute",  desc: "Filing false disputes or chargebacks after receiving items." },
    { value: "harassment",    label: "Harassment or abuse",               desc: "Threatening or abusive communication with the seller." },
    { value: "fake-return",   label: "Return fraud",                      desc: "Returning different or damaged items." },
    { value: "policy",        label: "Platform policy violation",         desc: "Actions that violate the buyer code of conduct." },
    { value: "other",         label: "Other",                             desc: "Something not listed above." },
  ],
  courier: [
    { value: "damaged",       label: "Damaged package",                   desc: "Package arrived damaged due to handling." },
    { value: "theft",         label: "Package theft or loss",             desc: "Package appears to have been stolen or lost." },
    { value: "false-delivery",label: "False delivery claim",              desc: "Courier marked delivered but item was not received." },
    { value: "unprofessional",label: "Unprofessional conduct",            desc: "Rude or inappropriate behavior during delivery." },
    { value: "delayed",       label: "Significant delay",                 desc: "Unexplained, excessive delay beyond the stated window." },
    { value: "other",         label: "Other",                             desc: "Something not listed above." },
  ],
  product: [
    { value: "counterfeit",   label: "Counterfeit or fake",               desc: "Product does not appear to be authentic." },
    { value: "prohibited",    label: "Prohibited item",                   desc: "Item is not allowed on this marketplace." },
    { value: "misleading",    label: "Misleading listing",                desc: "Description or images do not match the actual product." },
    { value: "safety",        label: "Safety concern",                    desc: "Product poses a potential safety or health risk." },
    { value: "ip",            label: "Intellectual property violation",   desc: "Unauthorized use of a trademark, copyright, or patent." },
    { value: "other",         label: "Other",                             desc: "Something not listed above." },
  ],
  conversation: [
    { value: "harassment",    label: "Harassment or threats",             desc: "Messages that are threatening, abusive, or intimidating." },
    { value: "spam",          label: "Spam or unsolicited promotion",     desc: "Repeated unwanted commercial messages." },
    { value: "scam",          label: "Scam or phishing",                  desc: "Attempts to obtain personal information or money." },
    { value: "inappropriate", label: "Inappropriate content",             desc: "Sexual, violent, or otherwise inappropriate content." },
    { value: "other",         label: "Other",                             desc: "Something not listed above." },
  ],
};

const TARGET_ICONS: Record<ReportTargetType, string> = {
  seller:       "🏪",
  buyer:        "👤",
  courier:      "🚚",
  product:      "📦",
  conversation: "💬",
};

export default function ReportDialog({ targetType, targetName, onClose }: ReportDialogProps) {
  const [step, setStep] = useState<ReportStep>("reason");
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [referenceId] = useState(`RPT-${Math.floor(100000 + Math.random() * 900000)}`);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reasons = REASONS[targetType];
  const selectedReasonObj = reasons.find(r => r.value === selectedReason);
  const canProceedToDetails = !!selectedReason;
  const canConfirm = description.trim().length >= 10;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setStep("success");
    }, 1400);
  };

  const STEP_ORDER: ReportStep[] = ["reason", "details", "confirm", "success"];
  const stepIdx = STEP_ORDER.indexOf(step);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-sm shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[var(--color-red-light)] border border-[var(--color-red-border)] flex items-center justify-center">
              <AlertTriangle size={14} className="text-[var(--color-red)]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-[600] text-[var(--color-ink)]">Report {targetType}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">{TARGET_ICONS[targetType]} {targetName}</p>
            </div>
          </div>
          {step !== "success" && (
            <button onClick={onClose} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Progress dots (not on success) */}
        {step !== "success" && (
          <div className="px-6 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2 shrink-0">
            {(["reason", "details", "confirm"] as ReportStep[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-[var(--font-mono)] transition-colors ${stepIdx > i ? "bg-[var(--color-green)] text-white" : stepIdx === i ? "bg-[var(--color-navy)] text-white" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] border border-[var(--color-border)]"}`}>
                  {stepIdx > i ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${stepIdx === i ? "text-[var(--color-ink)] font-[500]" : "text-[var(--color-ink-disabled)]"}`}>
                  {s === "reason" ? "Select reason" : s === "details" ? "Add details" : "Review & send"}
                </span>
                {i < 2 && <div className="w-8 h-px bg-[var(--color-border)]" />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* STEP 1: Reason */}
          {step === "reason" && (
            <div>
              <p className="text-sm text-[var(--color-ink-muted)] mb-4">
                What is the reason for this report? Select the option that best describes the issue.
              </p>
              <div className="space-y-2">
                {reasons.map(r => (
                  <label key={r.value} className={`flex gap-3 p-3.5 rounded-sm border cursor-pointer transition-all ${selectedReason === r.value ? "border-[var(--color-navy)] bg-[var(--color-navy-surface)]" : "border-[var(--color-border)] hover:border-[var(--color-navy)]/50 hover:bg-[var(--color-surface)]"}`}>
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={selectedReason === r.value}
                      onChange={() => setSelectedReason(r.value)}
                      className="mt-0.5 accent-[var(--color-navy)]"
                    />
                    <div>
                      <p className={`text-sm font-[500] ${selectedReason === r.value ? "text-[var(--color-navy)]" : "text-[var(--color-ink)]"}`}>{r.label}</p>
                      <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Details */}
          {step === "details" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                <Info size={12} className="text-[var(--color-navy)]" aria-hidden="true" />
                <span className="text-xs text-[var(--color-ink-muted)]">Reason: <span className="font-[500] text-[var(--color-ink)]">{selectedReasonObj?.label}</span></span>
              </div>

              <div>
                <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1.5">
                  Description <span className="text-[var(--color-red)]">*</span>
                </label>
                <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                  Provide specific details about the issue. Include dates, amounts, order numbers, or any other relevant information.
                </p>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe what happened, when it occurred, and how it affected you..."
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink)] placeholder-[var(--color-ink-disabled)] focus:outline-none focus:border-[var(--color-navy)] resize-none font-[var(--font-body)]"
                />
                <div className="flex justify-between mt-1">
                  {description.length < 10 && description.length > 0 && (
                    <p className="text-xs text-[var(--color-red)]">Please provide at least 10 characters</p>
                  )}
                  <span className="ml-auto font-[var(--font-mono)] text-[10px] text-[var(--color-ink-disabled)]">{description.length}/1000</span>
                </div>
              </div>

              {/* Evidence upload */}
              <div>
                <label className="block text-sm font-[500] text-[var(--color-ink)] mb-1">Evidence (optional)</label>
                <p className="text-xs text-[var(--color-ink-muted)] mb-2">
                  Screenshots, photos, or documents that support your report. Up to 5 files, 10MB each.
                </p>
                {files.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm">
                        <FileText size={14} className="text-[var(--color-navy)] shrink-0" aria-hidden="true" />
                        <span className="flex-1 text-xs text-[var(--color-ink)] truncate">{f.name}</span>
                        <span className="font-[var(--font-mono)] text-[9px] text-[var(--color-ink-disabled)]">{(f.size / 1024).toFixed(0)}KB</span>
                        <button onClick={() => removeFile(i)} className="text-[var(--color-ink-disabled)] hover:text-[var(--color-red)] cursor-pointer transition-colors">
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {files.length < 5 && (
                  <>
                    <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-[var(--color-border)] rounded-sm text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-navy)] hover:text-[var(--color-navy)] hover:bg-[var(--color-navy-surface)] cursor-pointer transition-all">
                      <ArrowUp size={14} aria-hidden="true" />
                      Attach files
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-ink-muted)]">
                Please review your report before submitting. Our Trust & Safety team will investigate within 3–5 business days.
              </p>

              <div className="border border-[var(--color-border)] rounded-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">Report summary</p>
                </div>
                <div className="px-4 py-4 space-y-3">
                  {[
                    ["Report target", `${TARGET_ICONS[targetType]} ${targetName}`],
                    ["Target type", targetType.charAt(0).toUpperCase() + targetType.slice(1)],
                    ["Reason", selectedReasonObj?.label ?? ""],
                    ["Evidence", files.length ? `${files.length} file${files.length > 1 ? "s" : ""} attached` : "None"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-3">
                      <span className="w-28 shrink-0 text-xs text-[var(--color-ink-muted)]">{label}</span>
                      <span className="text-sm text-[var(--color-ink)] font-[500]">{value}</span>
                    </div>
                  ))}
                  <div className="flex gap-3">
                    <span className="w-28 shrink-0 text-xs text-[var(--color-ink-muted)]">Description</span>
                    <p className="text-sm text-[var(--color-ink)] flex-1 leading-relaxed">{description}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5 px-4 py-3 bg-[var(--color-amber-light)] border border-[var(--color-amber-border)] rounded-sm">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[var(--color-amber)]" aria-hidden="true" />
                <p className="text-xs text-[var(--color-amber)] leading-relaxed">
                  False or malicious reports may result in action against your account. Only submit if you believe this is a genuine violation.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--color-green-light)] border-2 border-[var(--color-green-border)] flex items-center justify-center">
                <Check size={28} className="text-[var(--color-green)]" aria-hidden="true" />
              </div>
              <div>
                <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-1">Report submitted</p>
                <p className="text-sm text-[var(--color-ink-muted)] max-w-xs">
                  Thank you. Our Trust & Safety team will review your report and take appropriate action.
                </p>
              </div>
              <div className="w-full max-w-xs border border-[var(--color-border)] rounded-sm overflow-hidden text-left">
                <div className="px-4 py-2 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                  <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] uppercase tracking-widest">Reference</p>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    ["Report ID", referenceId],
                    ["Reported", `${TARGET_ICONS[targetType]} ${targetName}`],
                    ["Reason", selectedReasonObj?.label ?? ""],
                    ["Status", "Under review"],
                    ["Response time", "3–5 business days"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <span className="text-xs text-[var(--color-ink-muted)]">{label}</span>
                      <span className="font-[var(--font-mono)] text-[11px] text-[var(--color-ink)]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={onClose} className="px-6 py-2.5 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] cursor-pointer transition-colors">
                Done
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "success" && (
          <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-between items-center shrink-0 bg-[var(--color-surface)]">
            <button
              onClick={() => {
                if (step === "reason") onClose();
                else if (step === "details") setStep("reason");
                else if (step === "confirm") setStep("details");
              }}
              className="text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer transition-colors">
              {step === "reason" ? "Cancel" : "← Back"}
            </button>

            {step === "reason" && (
              <button
                onClick={() => setStep("details")}
                disabled={!canProceedToDetails}
                className={`px-5 py-2 text-sm font-[500] rounded-sm transition-colors cursor-pointer ${canProceedToDetails ? "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] border border-[var(--color-border)] cursor-not-allowed"}`}>
                Continue
              </button>
            )}

            {step === "details" && (
              <button
                onClick={() => setStep("confirm")}
                disabled={!canConfirm}
                className={`px-5 py-2 text-sm font-[500] rounded-sm transition-colors cursor-pointer ${canConfirm ? "bg-[var(--color-navy)] text-white hover:bg-[var(--color-navy-hover)]" : "bg-[var(--color-surface)] text-[var(--color-ink-disabled)] border border-[var(--color-border)] cursor-not-allowed"}`}>
                Continue
              </button>
            )}

            {step === "confirm" && (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 bg-[var(--color-red)] text-white text-sm font-[500] rounded-sm hover:opacity-90 cursor-pointer transition-all disabled:opacity-60">
                {submitting && (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                )}
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
