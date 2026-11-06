import { LegalDocumentPage, legalMetadata } from "@/components/ui/legal-document";
import { TERMOS } from "@/lib/legal";

export const metadata = legalMetadata(TERMOS);

export default function TermsPage() {
  return <LegalDocumentPage document={TERMOS} />;
}
