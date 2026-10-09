"use client";

import { useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { changeSalesPasswordAction } from "@/actions/sales-agents";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/theme/toast-provider";

export function SalesPasswordCard() {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await changeSalesPasswordAction(null, new FormData(event.currentTarget));
    setBusy(false);
    if (result.success) {
      toast(result.message, "success");
      formRef.current?.reset();
    } else {
      setError(result.message);
    }
  }

  return (
    <Card>
      <CardHeader title="Badilisha Nenosiri" />
      <CardBody>
        <form ref={formRef} className="space-y-3" onSubmit={save}>
          <Input label="Nenosiri la zamani" name="la_zamani" type="password" autoComplete="current-password" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Nenosiri jipya (herufi 6 au zaidi)" name="jipya" type="password" minLength={6} autoComplete="new-password" required />
            <Input label="Rudia nenosiri jipya" name="thibitisha" type="password" minLength={6} autoComplete="new-password" required />
          </div>
          {error ? <p className="rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
          <Button type="submit" loading={busy} icon={<KeyRound />}>Hifadhi Nenosiri</Button>
        </form>
      </CardBody>
    </Card>
  );
}
