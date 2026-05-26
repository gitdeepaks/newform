"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { useState, type MouseEvent, type ReactNode } from "react";

type AdminConfirmActionDialogProps = {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  isPending?: boolean;
  onConfirm: () => Promise<void> | void;
};

export function AdminConfirmActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel = "Working...",
  variant = "default",
  isPending = false,
  onConfirm,
}: AdminConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    await onConfirm();
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={variant} disabled={isPending} onClick={handleConfirm}>
            {isPending ? <Spinner /> : null}
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
