"use client";

import { useState } from "react";
import { Button, Field, FormError, Input } from "@/components/ui";
import { useAuthSubmit } from "@/components/AuthForm";

export function ChangePasswordForm({ email }: { email: string }) {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const { error, submitting, submit } = useAuthSubmit("/api/auth/change-password", "/dashboard");
  const fe = error?.fieldErrors ?? {};
  const mismatch = confirm !== "" && confirm !== newPassword;

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-lg font-semibold text-slate-900">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500">
          You signed in as <span className="font-medium text-slate-700">{email}</span> with a temporary password.
          Pick your own to continue.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            if (mismatch) {
              e.preventDefault();
              return;
            }
            submit(e, { currentPassword, newPassword });
          }}
        >
          <FormError error={error} />
          <Field label="Temporary password" hint="The one from your welcome email" error={fe.currentPassword}>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              autoFocus
            />
          </Field>
          <Field label="New password" hint="At least 8 characters" error={fe.newPassword}>
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
          <Button type="submit" className="w-full" loading={submitting} disabled={mismatch}>
            Save and continue
          </Button>
        </form>
      </div>
      <form action="/api/auth/logout" method="post" className="mt-6 text-center">
        <button type="submit" className="text-sm text-slate-500 hover:text-slate-700">
          Sign out
        </button>
      </form>
    </div>
  );
}
