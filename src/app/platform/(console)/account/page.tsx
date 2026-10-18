"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, type ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useIsClient } from "@/lib/hooks";
import { usePlatformAdmin } from "@/components/platform/PlatformShell";
import { useToast } from "@/components/session";
import { Button, Card, DescriptionList, Field, FormError, Input, PageHeader } from "@/components/ui";

export default function PlatformAccountPage() {
  const admin = usePlatformAdmin();
  const toast = useToast();
  const isClient = useIsClient(); // timestamps use the browser's timezone, so skip them in the server render
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const mismatch = confirm !== "" && confirm !== newPassword;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setSaving(true);
    setError(null);
    try {
      await api("/platform/auth/change-password", { body: { currentPassword, newPassword } });
      toast("Password changed");
      setCurrent("");
      setNew("");
      setConfirm("");
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="My account" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Super user">
          <DescriptionList
            items={[
              ["Name", admin.fullName],
              ["Email", admin.email],
              ["Last sign in", isClient ? formatDateTime(admin.lastLoginAt) : "\u00a0"],
            ]}
          />
          <p className="mt-6 text-xs text-slate-500">
            More super users are added from the server with{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">./create-superuser.sh --email=…</code>
          </p>
        </Card>
        <Card title="Change password">
          <form className="space-y-4" onSubmit={submit}>
            <FormError error={error} />
            <Field label="Current password" error={error?.fieldErrors.currentPassword}>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="New password" hint="At least 8 characters" error={error?.fieldErrors.newPassword}>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNew(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Confirm new password" error={mismatch ? "Passwords don't match" : undefined}>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </Field>
            <Button type="submit" variant="dark" className="w-full" loading={saving} disabled={mismatch}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
