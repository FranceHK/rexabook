"use client";

import { useActionState, useEffect, useRef } from "react";
import { createCustomerAction, updateCustomerAction } from "@/actions/customers";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

const initState: ActionResult = { success: false, message: "" };

interface CustomerDraft {
  jina: string;
  simu?: string;
  location?: string;
}

export function CustomerFormModal({
  open,
  onClose,
  onSuccess,
  initial,
  customerId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  initial?: CustomerDraft;
  customerId?: number;
}) {
  const isEdit = Boolean(customerId);

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => {
      if (isEdit && customerId) fd.set("mteja_id", String(customerId));
      return isEdit ? updateCustomerAction(prev, fd) : createCustomerAction(prev, fd);
    },
    initState
  );

  const handledRef = useRef<string | null>(null);
  useEffect(() => {
    if (state.success && state.message && handledRef.current !== state.message) {
      handledRef.current = state.message;
      onSuccess(state.message);
      onClose();
    }
  }, [state, onSuccess, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Hariri Mdaiwa" : "Mdaiwa Mpya"}
      subtitle={isEdit ? "Sasisha taarifa za mteja." : "Ongeza mteja mpya kwenye mfumo wako."}
      maxWidth="max-w-md"
    >
      <form action={formAction} className="space-y-4">
        <Input
          label="Jina la mteja"
          name="jina"
          placeholder="mf. Asha Mohamedi"
          defaultValue={initial?.jina}
          required
          error={state.fieldErrors?.jina}
        />
        <Input
          label="Namba ya simu"
          name="simu"
          type="tel"
          placeholder="mf. 2557XXXXXXX / 07XXXXXXXX"
          defaultValue={initial?.simu}
          error={state.fieldErrors?.simu}
        />
        <Input
          label="Makazi / Eneo"
          name="location"
          placeholder="mf. Kibaha, Kariakoo..."
          defaultValue={initial?.location}
          error={state.fieldErrors?.location}
        />

        {!state.success && state.message ? (
          <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
            {state.message}
          </p>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Ghairi</Button>
          <Button type="submit" loading={pending}>
            {isEdit ? "Hifadhi Mabadiliko" : "Hifadhi Mdaiwa"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}