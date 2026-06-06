import { Target } from "lucide-react";
import { CreateGoalForm } from "@/components/create-goal-form";

export default function CreateGoalPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-700">
          <Target className="h-4 w-4" />
          Create a new savings goal
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Set the target. Fund the vault. Track the climb.</h1>
        <p className="mt-3 text-muted-foreground">
          MiniSave is now wired for live PiggyBank vault creation once the factory address is deployed and added to frontend env.
        </p>
      </div>

      <CreateGoalForm />
    </main>
  );
}
