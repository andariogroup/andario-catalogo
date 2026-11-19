import { PrivacyConsentStudio } from "@/components/admin/privacy-form";
import { requirePermission } from "@/lib/auth";
import { loadPrivacySettings } from "@/lib/google-settings";
import { allows } from "@/lib/permissions";

export default async function PrivacyIntegrationsPage() {
  const user = await requirePermission("integrations", "read");
  const privacy = await loadPrivacySettings();
  const canEdit = allows(user.role, "integrations", "write");
  return (
    <main className="seo-page">
      <header className="seo-head">
        <p>Integraciones</p>
        <h1>Privacidad y cookies</h1>
        <p className="lead">Define el aviso de consentimiento y la vigencia de las preferencias para tecnologías opcionales de análisis.</p>
      </header>
      <PrivacyConsentStudio
        initial={{
          noticeEnabled: privacy.noticeEnabled,
          policyVersion: privacy.policyVersion,
          consentExpirationDays: privacy.consentExpirationDays,
          noticeTitle: privacy.noticeTitle,
          noticeDescription: privacy.noticeDescription,
          policyPath: privacy.policyPath,
          updatedAt: privacy.updatedAt && privacy.updatedAt.getTime() > 0 ? privacy.updatedAt.toISOString() : "",
          updatedBy: privacy.updatedBy,
        }}
        canEdit={canEdit}
      />
    </main>
  );
}
