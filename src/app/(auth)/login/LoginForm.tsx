"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Field, FormError, Input } from "@/components/ui";
import { useAuthSubmit } from "@/components/AuthForm";

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { error, submitting, submit } = useAuthSubmit("/api/auth/login", next);
  const fe = error?.fieldErrors ?? {};

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-lg font-semibold text-slate-900">Sign in to your company</h1>
        <p className="mt-1 text-sm text-slate-500">Use the company ID your HR team gave you.</p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => submit(e, { tenantSlug: tenantSlug.trim().toLowerCase(), email: email.trim(), password })}
        >
          {expired && !error && <Alert kind="info">Your session has expired. Please sign in again.</Alert>}
          <FormError error={error} />
          <Field label="Company ID" error={fe.tenantSlug}>
            <Input
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="acme"
              autoComplete="organization"
              autoCapitalize="none"
              required
              autoFocus
            />
          </Field>
          <Field label="Email" error={fe.email}>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
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
          <Button type="submit" className="w-full" loading={submitting}>
            Sign in
          </Button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to HRMS?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Register your company
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-400">
        <Link href="/platform/login" className="hover:text-slate-600">
          Platform administrator sign in
        </Link>
      </p>
    </div>
  );
}
