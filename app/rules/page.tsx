"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRules } from "@/hooks/useRules";
import { addRule, updateRule, deleteRule } from "@/lib/firestore";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Rule } from "@/types";

// ─── Rule Item ──────────────────────────────────────────────────────────────

function RuleItem({
  rule,
  index,
  userId,
}: {
  rule: Rule;
  index: number;
  userId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(rule.text);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!editText.trim() || editText.trim() === rule.text) {
      setEditText(rule.text);
      setEditing(false);
      return;
    }
    await updateRule(userId, rule.id, { text: editText.trim() });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditText(rule.text);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  const handleDelete = async () => {
    setDeleting(true);
    await deleteRule(userId, rule.id);
  };

  return (
    <li className="group flex items-start gap-3 border-b border-border/30 py-3.5 last:border-0">
      <span className="mt-px shrink-0 text-lg font-medium tabular-nums text-muted-foreground/50">
        {String(index + 1).padStart(2, "0")}.
      </span>

      {editing ? (
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 flex-1 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary hover:text-primary"
            onClick={handleSave}
          >
            <Check className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={handleCancel}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <>
          <p className="flex-1 text-lg leading-relaxed text-foreground/85">
            {rule.text}
          </p>
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground/40 hover:text-foreground"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 text-muted-foreground/40 hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
        </>
      )}
    </li>
  );
}

// ─── Rules Page ─────────────────────────────────────────────────────────────

export default function RulesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [user, authLoading, router]);

  const { rules, loading: rulesLoading } = useRules(user?.uid);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !user) return;

    setAdding(true);
    const nextOrder =
      rules.length > 0 ? rules[rules.length - 1].order + 1 : 0;

    await addRule(user.uid, newText.trim(), nextOrder);
    setNewText("");
    setAdding(false);
    setDialogOpen(false);
  };

  if (authLoading || (user && rulesLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Rules</h1>
          <p className="text-muted-foreground">
            Principles to follow throughout your GATE prep journey.
          </p>
        </div>

        {rules.length > 0 ? (
          <ol className="list-none pl-0">
            {rules.map((rule, index) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                index={index}
                userId={user.uid}
              />
            ))}
          </ol>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground/60">
              No rules yet. Tap + to add your first one.
            </p>
          </div>
        )}
      </main>

      {/* FAB — fixed bottom right */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 size-12 rounded-full shadow-lg"
          >
            <Plus className="size-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Rule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <Input
              placeholder="e.g. Learn while watching, don't just take notes"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              autoFocus
              required
            />
            <Button type="submit" disabled={adding || !newText.trim()} className="w-full">
              {adding ? "Adding..." : "Add Rule"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
