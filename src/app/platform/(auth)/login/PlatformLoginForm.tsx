"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Field, FormError, Input } from "@/components/ui";
import { useAuthSubmit } from "@/components/AuthForm";

export function PlatformLoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, submitting, submit } = useAuthSubmit("/api/platform-auth/login", next);
  const fe = error?.fieldErrors ?? {};

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 py-12">
      <div className="mb-8 flex items-center gap-3 text-white">
        <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-900">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-6" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4 7v5c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V7l-8-4Z" />
          </svg>
        </span>
        <span className="text-xl font-semibold tracking-tight">HRMS Platform</span>
      </div>

      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-lg font-semibold text-slate-900">Super user sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Manage companies and their HR admins.</p>

        <form className="mt-6 space-y-4" onSubmit={(e) => submit(e, { email: email.trim(), password })}>
          {expired && !error && <Alert kind="info">Your session has expired. Please sign in again.</Alert>}
          <FormError error={error} />
          <Field label="Email" error={fe.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
            />
          </Field>
          <Field label="Password" error={fe.password}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" variant="dark" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Looking for your company&apos;s HR app?{" "}
        <Link href="/login" className="font-medium text-emerald-400 hover:text-emerald-300">
          Company sign in
        </Link>
      </p>
    </div>
  );
}
