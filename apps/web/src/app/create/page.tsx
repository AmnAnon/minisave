import { Target } from "lucide-react";
import { CreateGoalForm } from "@/components/create-goal-form";

export default function CreateGoalPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
          <Target className="h-4 w-4" />
          Create vault
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-amber-50 sm:text-4xl">Set the target. Fund the vault. Track the climb.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-100/60">
          Create a disciplined savings vault for a specific goal, optionally lock it behind time, and manage the position later from Portfolio.
        </p>
      </div>

      <CreateGoalForm />
    </main>
  );
}
