"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Field, FormError, Input, Select } from "@/components/ui";
import { useAuthSubmit } from "@/components/AuthForm";
import { useTimezones, withZone } from "@/lib/timezones";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    timezone: "", // "" = the browser's timezone
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const { error, submitting, submit } = useAuthSubmit("/api/auth/register", "/dashboard");
  const fe = error?.fieldErrors ?? {};
  const { zones, detected } = useTimezones();
  const timezone = form.timezone || detected;

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="w-full max-w-lg">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <h1 className="text-lg font-semibold text-slate-900">Register your company</h1>
        <p className="mt-1 text-sm text-slate-500">
          This creates your company and your HR admin account. You can add employees afterwards.
        </p>

        <form className="mt-6 space-y-5" onSubmit={(e) => submit(e, { ...form, timezone })}>
          <FormError error={error} />

          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Company</legend>
            <Field label="Company name" error={fe.companyName} required>
              <Input
                value={form.companyName}
                onChange={(e) => {
                  const companyName = e.target.value;
                  setForm((f) => ({ ...f, companyName, slug: slugTouched ? f.slug : slugify(companyName) }));
                }}
                required
                autoFocus
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Company ID"
                error={fe.slug}
                hint="Employees type this when they sign in"
                required
              >
                <Input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() }));
                  }}
                  pattern="[a-z0-9][a-z0-9\-]{1,58}[a-z0-9]"
                  title="3–60 lowercase letters, digits or hyphens"
                  required
                />
              </Field>
              <Field label="Timezone" error={fe.timezone}>
                <Select value={timezone} onChange={set("timezone")}>
                  {withZone(zones, timezone).map((tz) => (
                    <option key={tz}>{tz}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Your HR admin account</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" error={fe.adminFirstName} required>
                <Input value={form.adminFirstName} onChange={set("adminFirstName")} autoComplete="given-name" required />
              </Field>
              <Field label="Last name" error={fe.adminLastName} required>
                <Input value={form.adminLastName} onChange={set("adminLastName")} autoComplete="family-name" required />
              </Field>
            </div>
            <Field label="Work email" error={fe.adminEmail} required>
              <Input type="email" value={form.adminEmail} onChange={set("adminEmail")} autoComplete="email" required />
            </Field>
            <Field label="Password" error={fe.adminPassword} hint="At least 8 characters" required>
              <Input
                type="password"
                value={form.adminPassword}
                onChange={set("adminPassword")}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </fieldset>

          <Button type="submit" className="w-full" loading={submitting}>
            Create company
          </Button>
        </form>
      </div>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}
