import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateGoalForm } from "@/components/create-goal-form";

export default function CreateGoalPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-emerald-400" />
          <h1 className="text-xl font-semibold text-zinc-50 font-mono font-semibold">Create Vault</h1>
        </div>
        <Button asChild variant="outline" size="sm" className="h-9 border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 font-mono">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <CreateGoalForm />
    </main>
  );
}
