import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/AuthContext";
import { ApiError } from "../../api/client";
import AuthLayout, { Field, PasswordStrength, AuthAlert } from "./AuthLayout";

type NavFn = (page: string, params?: Record<string, string>) => void;

export default function RegisterPage({ onNavigate }: { onNavigate: NavFn }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const submissionInFlightRef = useRef(false);
  const passwordRequirements = {
    length: password.length >= 8,
    maxLength: password.length <= 16,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
  const passwordMeetsRequirements =
    passwordRequirements.length &&
    passwordRequirements.maxLength &&
    passwordRequirements.uppercase &&
    passwordRequirements.number &&
    passwordRequirements.symbol;

  const normalizePhilippinePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("63")) return `+${digits}`;
    if (digits.startsWith("0")) return `+63${digits.slice(1)}`;
    if (digits.startsWith("9") && digits.length === 10) return `+63${digits}`;
    return `+63${digits}`;
  };

  const displayPhone = phoneLocal.replace(/\D/g, "").slice(0, 10);

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (submissionInFlightRef.current) return;

    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "First name is required";
    if (!lastName.trim()) e.lastName = "Last name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email";
    if (!displayPhone) e.phone = "Phone number is required";
    else if (displayPhone.length !== 10) e.phone = "Enter a 10-digit mobile number";
    if (!password) e.password = "Password is required";
    else if (!passwordMeetsRequirements) e.password = "Use 8-16 characters with one uppercase letter, one number, and one symbol.";
    if (password !== confirm) e.confirm = "Passwords do not match";
    if (!agreed) e.agreed = "You must agree to the Terms and Privacy Policy";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    submissionInFlightRef.current = true;
    setErrors({});
    setLoading(true);
    setMessage(null);

    try {
      const response = await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: normalizePhilippinePhone(displayPhone),
        password,
        password_confirmation: confirm,
      });

      setSuccess(true);
      setMessage(response.message ?? "Your account was created. Please enter the verification code sent to your email.");
      navigate(response.redirectTo ?? `/auth/verify-email?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
        state: {
          registrationMessage: response.message,
          verificationEmailSent: response.verificationEmailSent,
        },
      });
    } catch (err) {
      if (import.meta.env.DEV && err instanceof ApiError) {
        console.error("Registration request failed", {
          status: err.status,
          message: err.message,
          validationErrors: err.errors,
        });
      }

      if (err instanceof ApiError && err.errors) {
        setErrors({
          firstName: err.errors.first_name?.[0],
          lastName: err.errors.last_name?.[0],
          email: err.errors.email?.[0],
          phone: err.errors.phone?.[0],
          password: err.errors.password?.[0],
          confirm: err.errors.password_confirmation?.[0],
        });
      }

      setMessage(
        err instanceof ApiError
          ? err.message
          : "Unable to create your account right now. Please try again."
      );
    } finally {
      submissionInFlightRef.current = false;
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Check your email" subtitle={message ?? "We sent a verification code to your inbox."}>
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-[var(--color-green-light)] border border-[var(--color-green-border)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed mb-6">
            Your Maketo account was created successfully, but it still needs email verification before you can sign in.
          </p>
          <p className="text-xs text-[var(--color-ink-muted)] mt-4">
            Once you enter the code from the email, you can continue normally.{" "}
            <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Back to login</button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Maketo as a buyer"
      footer={
        <span>
          Already have an account?{" "}
          <button onClick={() => onNavigate("login")} className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">
            Sign in
          </button>
        </span>
      }>

      {message && <AuthAlert type="error" message={message} />}

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" value={firstName} onChange={setFirstName}
            placeholder="Ana" error={errors.firstName} required />
          <Field label="Last name" value={lastName} onChange={setLastName}
            placeholder="Reyes" error={errors.lastName} required />
        </div>

        <Field label="Email address" type="email" value={email} onChange={setEmail}
          placeholder="you@example.com" error={errors.email} required />

        <div>
          <label className="block text-xs font-[600] text-[var(--color-ink)] mb-1.5">
            Phone number <span className="text-[var(--color-red)] ml-0.5">*</span>
          </label>
          <div className={`flex items-center rounded-sm border bg-white transition-all ${errors.phone ? "border-[var(--color-red)] focus-within:ring-2 focus-within:ring-[var(--color-red)]/15" : "border-[var(--color-border)] focus-within:border-[var(--color-navy)] focus-within:ring-2 focus-within:ring-[var(--color-navy)]/10"}`}>
            <span className="px-3.5 py-2.5 text-sm text-[var(--color-ink-muted)] border-r border-[var(--color-border)] bg-[var(--color-surface)] select-none">
              +63
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={displayPhone}
              onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="917 555 0182"
              className="flex-1 px-3.5 py-2.5 text-sm outline-none bg-transparent text-[var(--color-ink)] placeholder:text-[var(--color-ink-disabled)]"
            />
          </div>
          {errors.phone ? <p className="text-xs text-[var(--color-red)] mt-1.5 flex items-center gap-1">{errors.phone}</p> : <p className="text-xs text-[var(--color-ink-muted)] mt-1.5">Enter your 10-digit mobile number without the +63.</p>}
        </div>

        <div className="space-y-2">
          <Field label="Password" type="password" value={password} onChange={setPassword}
            placeholder="Create a strong password" error={errors.password} required
            hint={!errors.password ? "Use 8-16 characters with uppercase, number, and symbol." : undefined}
            maxLength={16} />
          <PasswordStrength password={password} />
        </div>

        <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm}
          placeholder="Repeat your password" error={errors.confirm} required maxLength={16} />

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div onClick={() => setAgreed(a => !a)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${agreed ? "bg-[var(--color-navy)] border-[var(--color-navy)]" : errors.agreed ? "border-[var(--color-red)]" : "border-[var(--color-border-strong)] group-hover:border-[var(--color-navy)]"}`}>
              {agreed && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span className="text-sm text-[var(--color-ink-muted)] leading-snug">
              I agree to Maketo's{" "}
              <span className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Terms of Service</span>
              {" "}and{" "}
              <span className="text-[var(--color-navy)] font-[500] hover:underline cursor-pointer">Privacy Policy</span>
            </span>
          </label>
          {errors.agreed && <p className="text-xs text-[var(--color-red)] mt-1.5 ml-6">{errors.agreed}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[var(--color-navy)] text-white text-sm font-[500] rounded-sm hover:bg-[var(--color-navy-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center justify-center gap-2">
          {loading ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="7" cy="7" r="5" strokeOpacity="0.3" /><path d="M7 2a5 5 0 015 5" strokeLinecap="round" />
              </svg>
              Creating account...
            </>
          ) : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
