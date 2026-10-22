"use client";

import { useState, type FormEvent } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { blankToNull, formatDateTime } from "@/lib/format";
import type { EmailSettings, EmailSettingsInput, SmtpSecurity, TestEmailResult } from "@/lib/types";
import { useToast } from "@/components/session";
import { Alert, Button, Card, Checkbox, Field, FormError, Input, Loading, Select } from "@/components/ui";

/** Common providers, so HR doesn't have to look up server names and ports. */
const PRESETS: { label: string; host: string; port: number; security: SmtpSecurity }[] = [
  { label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 587, security: "STARTTLS" },
  { label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, security: "STARTTLS" },
  { label: "Zoho Mail", host: "smtp.zoho.com", port: 587, security: "STARTTLS" },
];

export function EmailSettingsCard() {
  const { data, error, reload } = useApi<EmailSettings>("/tenant/email-settings");
  return (
    <Card
      title="Email"
      description="How emails to your employees (new accounts, leave requests and decisions) are sent."
    >
      {error ? <Alert>{error.message}</Alert> : data ? <EmailSettingsForm settings={data} onSaved={reload} /> : <Loading />}
    </Card>
  );
}

function EmailSettingsForm({ settings, onSaved }: { settings: EmailSettings; onSaved: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    senderName: settings.senderName ?? "",
    replyTo: settings.replyTo ?? "",
    smtpEnabled: settings.smtpEnabled,
    smtpHost: settings.smtpHost ?? "",
    smtpPort: settings.smtpPort?.toString() ?? "587",
    smtpSecurity: settings.smtpSecurity ?? ("STARTTLS" as SmtpSecurity),
    smtpUsername: settings.smtpUsername ?? "",
    smtpPassword: "",
    smtpFromEmail: settings.smtpFromEmail ?? "",
  });
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: true; result: TestEmailResult } | { ok: false; message: string } | null>(null);
  const fe = error?.fieldErrors ?? {};

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // The saved password only counts while the username is the one it was saved with.
  const passwordSaved = settings.smtpPasswordSet && form.smtpUsername.trim() === (settings.smtpUsername ?? "");

  function body(): EmailSettingsInput {
    return {
      senderName: blankToNull(form.senderName),
      replyTo: blankToNull(form.replyTo),
      smtpEnabled: form.smtpEnabled,
      smtpHost: blankToNull(form.smtpHost),
      smtpPort: form.smtpPort.trim() ? Number(form.smtpPort) : null,
      smtpSecurity: form.smtpSecurity,
      smtpUsername: blankToNull(form.smtpUsername),
      smtpPassword: form.smtpPassword === "" ? null : form.smtpPassword,
      smtpFromEmail: blankToNull(form.smtpFromEmail),
    };
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api<EmailSettings>("/tenant/email-settings", { method: "PUT", body: body() });
      toast("Email settings saved");
      setForm((f) => ({ ...f, smtpPassword: "" }));
      onSaved();
    } catch (err) {
      setError(toApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const result = await api<TestEmailResult>("/tenant/email-settings/test", { body: body() });
      setTestResult({ ok: true, result });
    } catch (err) {
      const apiError = toApiError(err);
      if (Object.keys(apiError.fieldErrors).length > 0) setError(apiError);
      else setTestResult({ ok: false, message: apiError.message });
    } finally {
      setTesting(false);
    }
  }

  const shownName = form.senderName.trim() || settings.companyName;
  const shownAddress = form.smtpEnabled ? form.smtpFromEmail.trim() || "your-address@company.com" : settings.platformFromAddress;
  const repliesTo = form.replyTo.trim() || (form.smtpEnabled ? shownAddress : null);

  return (
    <form className="space-y-5" onSubmit={submit}>
      <FormError error={error} />

      {settings.smtpEnabled && settings.lastError && (
        <Alert>
          <strong className="font-semibold">Your mail server failed on {formatDateTime(settings.lastErrorAt)}.</strong>{" "}
          {settings.lastError} Emails are still being delivered from {settings.platformFromAddress} until this is fixed.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sender name" error={fe.senderName} hint={`Defaults to “${settings.companyName}”`}>
          <Input value={form.senderName} onChange={set("senderName")} maxLength={100} placeholder={`${settings.companyName} HR`} />
        </Field>
        <Field label="Reply-to address" error={fe.replyTo} hint="Where replies from employees go, e.g. your HR inbox">
          <Input type="email" value={form.replyTo} onChange={set("replyTo")} maxLength={150} placeholder="hr@yourcompany.com" />
        </Field>
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
        <p>
          Emails will show as{" "}
          <span className="font-medium text-slate-900">
            {shownName} &lt;{shownAddress}&gt;
          </span>
        </p>
        <p className="mt-0.5">
          {repliesTo ? (
            <>
              Replies go to <span className="font-medium text-slate-900">{repliesTo}</span>
            </>
          ) : (
            "Replies aren't monitored. Add a reply-to address so employees can answer."
          )}
        </p>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <Checkbox
          label={<span className="font-medium">Send from our own mail server (SMTP)</span>}
          checked={form.smtpEnabled}
          onChange={(e) => setForm((f) => ({ ...f, smtpEnabled: e.target.checked }))}
        />
        <p className="mt-1 text-xs text-slate-500">
          Emails then come from your own address instead of {settings.platformFromAddress}. If your server ever fails,
          emails are still delivered from the platform address and you&apos;ll see the error here.
        </p>
      </div>

      {form.smtpEnabled && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Fill in for:</span>
            {PRESETS.map((p) => (
              <Button
                key={p.host}
                size="sm"
                variant="secondary"
                onClick={() =>
                  setForm((f) => ({ ...f, smtpHost: p.host, smtpPort: String(p.port), smtpSecurity: p.security }))
                }
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-6">
            <Field label="Server" error={fe.smtpHost} required className="sm:col-span-3">
              <Input value={form.smtpHost} onChange={set("smtpHost")} placeholder="smtp.yourcompany.com" maxLength={255} />
            </Field>
            <Field label="Port" error={fe.smtpPort} required className="sm:col-span-1">
              <Select value={form.smtpPort} onChange={set("smtpPort")}>
                {["587", "465", "25", "2525"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Security" error={fe.smtpSecurity} required className="sm:col-span-2">
              <Select value={form.smtpSecurity} onChange={set("smtpSecurity")}>
                <option value="STARTTLS">STARTTLS (port 587)</option>
                <option value="SSL">SSL/TLS (port 465)</option>
                <option value="NONE">None (not recommended)</option>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username" error={fe.smtpUsername} hint="Usually your full email address">
              <Input value={form.smtpUsername} onChange={set("smtpUsername")} maxLength={150} autoComplete="off" />
            </Field>
            <Field
              label="Password"
              error={fe.smtpPassword}
              hint={
                passwordSaved
                  ? "Saved. Leave blank to keep it."
                  : "Gmail and Outlook need an app password, not your normal password."
              }
            >
              <Input
                type="password"
                value={form.smtpPassword}
                onChange={set("smtpPassword")}
                placeholder={passwordSaved ? "••••••••" : ""}
                maxLength={200}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <Field
            label="Send from address"
            error={fe.smtpFromEmail}
            required
            hint="Must be an address your mail server is allowed to send as"
          >
            <Input type="email" value={form.smtpFromEmail} onChange={set("smtpFromEmail")} placeholder="hr@yourcompany.com" maxLength={150} />
          </Field>
        </div>
      )}

      {testResult &&
        (testResult.ok ? (
          <Alert kind="success">
            Test email sent to {testResult.result.sentTo} through {testResult.result.via}. Check that inbox, including
            the spam folder.
          </Alert>
        ) : (
          <Alert>Test email failed: {testResult.message}</Alert>
        ))}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={sendTest} loading={testing}>
          Send test email
        </Button>
        <Button type="submit" loading={saving}>
          Save email settings
        </Button>
      </div>
    </form>
  );
}
