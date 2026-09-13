"use client";

import { useActionState, useEffect, useRef } from "react";
import { createDebtAction } from "@/actions/debts";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import { toDatetimeLocal } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";

const initState: ActionResult = { success: false, message: "" };

export function DebtFormModal({
  customerId,
  customerName,
  open,
  onClose,
}: {
  customerId: number;
  customerName: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => {
      fd.set("mteja_id", String(customerId));
      return createDebtAction(prev, fd);
    },
    initState
  );

  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.success && state.message && handledRef.current !== state.message) {
      handledRef.current = state.message;
      toast(state.message);
      onClose();
    }
  }, [state, onClose, toast]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ongeza Deni"
      subtitle={`Mdaiwa: ${customerName}`}
      maxWidth="max-w-md"
    >
      <form action={formAction} className="space-y-4">
        <Input
          label="Jina la bidhaa / huduma"
          name="jina_bidhaa"
          placeholder="mf. Unga wa mahindi (saga 2)"
          required
          error={state.fieldErrors?.jina_bidhaa}
        />
        <Input
          label="Kiasi (TZS)"
          name="kiasi"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          required
          error={state.fieldErrors?.kiasi}
        />
        <Input
          label="Tarehe ya kukopa"
          name="tarehe"
          type="datetime-local"
          defaultValue={toDatetimeLocal(new Date())}
          required
          error={state.fieldErrors?.tarehe}
        />
        <Textarea
          label="Maelezo (hiari)"
          name="maelezo"
          placeholder="Maelezo yoyote kuhusu deni hili..."
          error={state.fieldErrors?.maelezo}
        />

        {!state.success && state.message && !state.fieldErrors?.jina_bidhaa ? (
          <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="submit" loading={pending}>Hifadhi Deni</Button>
        </div>
      </form>
    </Modal>
  );
}