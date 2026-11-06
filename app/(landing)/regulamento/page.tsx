import { LegalDocumentPage, legalMetadata } from "@/components/ui/legal-document";
import { REGULAMENTO } from "@/lib/legal";

export const metadata = legalMetadata(REGULAMENTO);

export default function RulesPage() {
  return <LegalDocumentPage document={REGULAMENTO} />;
}
