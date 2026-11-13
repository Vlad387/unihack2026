import { CreateConsultation } from "@/components/create-consultation";
import { ProposalRound } from "@/components/proposal-round";
import { getConsultation } from "@/lib/api";

export default async function OrganizerPage() {
  return (
    <div className="flex flex-col gap-6">
      <CreateConsultation initial={await getConsultation()} />
      <ProposalRound />
    </div>
  );
}
