"use client";

import { useState } from "react";
import { api, toApiError, useApi, type ApiError } from "@/lib/api";
import { APPROVAL_STEP_KINDS, type ApprovalChain, type ApprovalStepKind } from "@/lib/types";
import { STEP_KIND_LABELS } from "./leave";
import { useToast } from "./session";
import { Button, Card, Checkbox, FormError, Loading } from "./ui";

const HINTS: Record<ApprovalStepKind, string> = {
  REPORTING_MANAGER: "The employee's manager.",
  MANAGERS_MANAGER: "The manager's own manager.",
  HR_ADMIN: "Any HR admin. Always the last step.",
};

/** Company-wide leave approval chain (HR). Changes apply to requests submitted afterwards. */
export function LeaveApprovalCard() {
  const chain = useApi<ApprovalChain>("/leave-approval-chain");
  return (
    <Card
      title="Leave approval"
      description="Who approves leave requests, in order. Each step must approve before the next one sees the request."
    >
      {chain.data ? (
        <ChainForm key={chain.data.steps.join()} saved={chain.data.steps} onSaved={chain.reload} />
      ) : (
        <>
          <FormError error={chain.error} />
          {!chain.error && <Loading />}
        </>
      )}
    </Card>
  );
}

function ChainForm({ saved, onSaved }: { saved: ApprovalStepKind[]; onSaved: () => void }) {
  const toast = useToast();
  const [steps, setSteps] = useState<ApprovalStepKind[]>(saved);
  const [error, setError] = useState<ApiError | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (kind: ApprovalStepKind, on: boolean) =>
    setSteps((current) => APPROVAL_STEP_KINDS.filter((k) => (k === kind ? on : current.includes(k))));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api<ApprovalChain>("/leave-approval-chain", {
        method: "PUT",
        body: { steps },
      });
      toast("Leave approval steps saved");
      onSaved();
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setSaving(false);
    }
  }

  const dirty = steps.join() !== saved.join();

  return (
    <div className="space-y-4">
      <FormError error={error} />
      <div className="space-y-3">
        {APPROVAL_STEP_KINDS.map((kind) => (
          <div key={kind}>
            <Checkbox
              label={<span className="font-medium">{STEP_KIND_LABELS[kind]}</span>}
              checked={steps.includes(kind)}
              onChange={(e) => toggle(kind, e.target.checked)}
            />
            <p className="ml-6 text-xs text-slate-500">{HINTS[kind]}</p>
          </div>
        ))}
      </div>

      {steps.length > 0 ? (
        <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <span className="font-medium">Flow: </span>
          {steps.map((k, i) => `${i + 1}. ${STEP_KIND_LABELS[k]}`).join("  →  ")}
        </p>
      ) : (
        <p className="text-sm text-red-600">Choose at least one step.</p>
      )}
      <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
        <li>If someone has no manager (or that person is inactive), HR admins approve that step instead.</li>
        <li>An HR admin can approve at any step, and their approval completes the request.</li>
        <li>Requests already submitted keep the steps they started with.</li>
      </ul>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving} disabled={!dirty || steps.length === 0}>
          Save approval steps
        </Button>
      </div>
    </div>
  );
}
