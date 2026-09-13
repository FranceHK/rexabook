"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPaymentAction } from "@/actions/debts";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/theme/toast-provider";
import { fmtPesa } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";

const initState: ActionResult = { success: false, message: "" };

export interface PayableDebt {
  id: number;
  jinaBidhaa?: string | null;
  kiasiAsili: number;
  kiasiKilicholipwa: number;
  bakaa: number;
}

export function PaymentFormModal({
  debt,
  open,
  onClose,
}: {
  debt: PayableDebt | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => {
      if (debt) fd.set("deni_id", String(debt.id));
      return addPaymentAction(prev, fd);
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

  if (!debt) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Weka Malipo"
      subtitle={`Deni: ${debt.jinaBidhaa ?? "—"}`}
      maxWidth="max-w-md"
    >
      <div className="mb-4 rounded-xl bg-surface-2 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-3">Imebaki kwenye deni hili</span>
          <span className="font-semibold text-ink">{fmtPesa(debt.bakaa)}</span>
        </div>
        <div className="mt-1 flex justify-between text-xs text-ink-3">
          <span>Asili: {fmtPesa(debt.kiasiAsili)}</span>
          <span>Imelipwa: {fmtPesa(debt.kiasiKilicholipwa)}</span>
        </div>
      </div>

      <form key={debt.id} action={formAction} className="space-y-4">
        <Input
          label="Kiasi cha malipo (TZS)"
          name="kiasi"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          required
          error={state.fieldErrors?.kiasi}
        />
        <Textarea
          label="Maelezo (hiari)"
          name="maelezo"
          placeholder="mf. Alilipa sehemu ya deni la kwanza"
          error={state.fieldErrors?.maelezo}
        />

        {!state.success && state.message ? (
          <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="submit" variant="success" loading={pending}>Weka Malipo</Button>
        </div>
      </form>
    </Modal>
  );
}