import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { FileText } from "lucide-react"
import { currentApplication, type AuthUser, type LogisticsApplication } from "../api"
import AuthLayout from "../components/AuthLayout"
import { Alert, Button, DetailRow, EmptyState, LoadingRows, StatusBadge } from "../components/ui"

/**
 * Landing page for a signed-in identity that does not have Logistics access yet.
 *
 * The portal is the single logistics door, so this page answers the question the
 * user could not answer themselves: whether they have applied, where that
 * application stands, and what to do next. Everything shown comes from
 * GET /api/logistics/application.
 */

const formatDate = (value: string | null): string =>
  value ? new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-"

export default function ApplicationStatusPage({ user, isAdmin }: { user: AuthUser; isAdmin: boolean }) {
  const navigate = useNavigate()
  const [application, setApplication] = useState<LogisticsApplication | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void currentApplication()
      .then(response => setApplication(response.data))
      .catch(reason => setError(reason instanceof Error ? reason.message : "Unable to load your application."))
      .finally(() => setLoading(false))
  }, [])

  const canApply = !isAdmin && (!application || application.status === "rejected")

  return (
    <AuthLayout
      title="Logistics access"
      subtitle={`Signed in as ${user.email}.`}
      footnote={canApply ? undefined : (
        <span>Approved partners are taken straight to the dashboard when they sign in.</span>
      )}
    >
      {error && <Alert>{error}</Alert>}

      {loading ? <LoadingRows rows={3} /> : (
        <>
          {application ? (
            <>
              <Alert type={application.status === "rejected" ? "error" : "info"}>
                {application.status === "pending"
                  ? "Your provider application is with a Marketo administrator for review. You will be able to sign in to the workspace once it is approved."
                  : application.status === "rejected"
                    ? "Your provider application was not approved. You can submit a new application."
                    : "Your provider application was approved. Workspace access appears here once your staff record is active."}
              </Alert>

              <dl className="space-y-4">
                <DetailRow label="Company">{application.company_name}</DetailRow>
                <DetailRow label="Status"><StatusBadge status={application.status} /></DetailRow>
                <DetailRow label="Submitted">{formatDate(application.submitted_at)}</DetailRow>
                {application.reviewed_at && <DetailRow label="Reviewed">{formatDate(application.reviewed_at)}</DetailRow>}
                {application.documents.length > 0 && (
                  <DetailRow label="Documents">{application.documents.length} uploaded</DetailRow>
                )}
              </dl>

              {application.rejection_reason && (
                <p className="text-sm text-[var(--color-ink-muted)] leading-relaxed">
                  <span className="font-[600] text-[var(--color-ink)]">Reason: </span>
                  {application.rejection_reason}
                </p>
              )}
            </>
          ) : isAdmin ? (
            <Alert type="warning">
              This is a Marketo administrator identity. Administrators manage logistics providers
              from the admin panel and cannot hold provider access themselves.
            </Alert>
          ) : (
            <EmptyState
              icon={<FileText size={18} aria-hidden="true" />}
              title="No logistics application yet"
              description="This Marketo identity does not have Logistics access and has not applied. Apply to become a provider and an administrator will review it."
            />
          )}

          {canApply && (
            <Button fullWidth onClick={() => navigate("/apply")}>
              {application ? "Submit a new application" : "Apply as a Logistics Provider"}
            </Button>
          )}
        </>
      )}
    </AuthLayout>
  )
}
