import { CreateConsultation } from "@/components/create-consultation";
import { getConsultation } from "@/lib/api";

export default async function OrganizerPage() {
  return <CreateConsultation initial={await getConsultation()} />;
}
