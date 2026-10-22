"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, toApiError, type ApiError } from "@/lib/api";
import type { TenantSummary } from "@/lib/types";
import { useToast } from "@/components/session";
import { TimezoneSelect } from "@/components/TimezoneSelect";
import { Button, Card, Field, FormError, Input, PageHeader } from "@/components/ui";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export default function NewCompanyPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({
    companyName: "",
    slug: "",
    timezone: "UTC",
    adminFirstName: "",
    adminLastName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const fe = error?.fieldErrors ?? {};
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const tenant = await api<TenantSummary>("/platform/tenants", { body: form });
      toast(`${tenant.name} created`);
      router.push(`/platform/tenants/${tenant.id}`);
    } catch (err) {
      setError(toApiError(err));
      setSaving(false);
    }
  }

  return (
    <>
      <Link href="/platform" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Companies
      </Link>
      <PageHeader
        title="New company"
        description="Creates the company with default leave types (Annual, Sick, Casual) and its first HR admin."
      />
      <form className="max-w-3xl space-y-6" onSubmit={submit}>
        <FormError error={error} />
        <Card title="Company">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" error={fe.companyName} required className="sm:col-span-2">
              <Input
                value={form.companyName}
                onChange={(e) => {
                  const companyName = e.target.value;
                  setForm((f) => ({ ...f, companyName, slug: slugTouched ? f.slug : slugify(companyName) }));
                }}
                maxLength={150}
                required
                autoFocus
              />
            </Field>
            <Field label="Company ID" error={fe.slug} hint="Employees type this when they sign in. Can't be changed later." required>
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
              <TimezoneSelect value={form.timezone} onChange={(timezone) => setForm((f) => ({ ...f, timezone }))} />
            </Field>
          </div>
        </Card>

        <Card title="First HR admin" description="This person signs in to the company's HR app and can add everyone else.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={fe.adminFirstName} required>
              <Input value={form.adminFirstName} onChange={set("adminFirstName")} maxLength={80} required />
            </Field>
            <Field label="Last name" error={fe.adminLastName} required>
              <Input value={form.adminLastName} onChange={set("adminLastName")} maxLength={80} required />
            </Field>
            <Field label="Email" error={fe.adminEmail} required>
              <Input type="email" value={form.adminEmail} onChange={set("adminEmail")} maxLength={150} required />
            </Field>
            <Field label="Initial password" error={fe.adminPassword} hint="At least 8 characters. Share it securely." required>
              <Input
                type="password"
                value={form.adminPassword}
                onChange={set("adminPassword")}
                minLength={8}
                autoComplete="new-password"
                required
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push("/platform")}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} variant="dark">
            Create company
          </Button>
        </div>
      </form>
    </>
  );
}
