import { LegalDocumentPage, legalMetadata } from "@/components/ui/legal-document";
import { PRIVACIDADE } from "@/lib/legal";

export const metadata = legalMetadata(PRIVACIDADE);

export default function PrivacyPage() {
  return <LegalDocumentPage document={PRIVACIDADE} />;
}
