import { Target } from "lucide-react";
import { CreateGoalForm } from "@/components/create-goal-form";

export default function CreateGoalPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-300">
          <Target className="h-4 w-4 text-emerald-300" />
          Create vault
        </div>
        <h1 className="mt-4 text-[30px] font-semibold tracking-tight text-zinc-50 sm:text-4xl">Set the target. Fund the vault. Track the climb.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Create a disciplined savings vault for a specific goal, set an optional unlock date, and manage everything from portfolio.
        </p>
      </div>

      <CreateGoalForm />
    </main>
  );
}
