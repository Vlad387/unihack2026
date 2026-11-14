import { CreateConsultation } from "@/components/create-consultation";
import { OrganizerControls } from "@/components/organizer-controls";
import { getConsultation } from "@/lib/api";

export default async function OrganizerPage() {
  return (
    <div className="flex flex-col gap-6">
      <CreateConsultation initial={await getConsultation()} />
      <OrganizerControls />
    </div>
  );
}
