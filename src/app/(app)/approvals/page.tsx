"use client";

import { useState } from "react";
import { useApi } from "@/lib/api";
import type { LeaveRequest } from "@/lib/types";
import { DecisionButtons, DecisionDialog, LeaveRequestTable, type Decision } from "@/components/leave";
import { Card, DataState, EmptyState, PageHeader } from "@/components/ui";
import { useSession } from "@/components/session";

export default function ApprovalsPage() {
  const { isHr } = useSession();
  const pending = useApi<LeaveRequest[]>("/leave-requests/pending-approvals");
  const [decision, setDecision] = useState<Decision | null>(null);

  return (
    <>
      <PageHeader
        title="Approvals"
        description={
          isHr
            ? "Pending leave requests you can decide on. As HR admin you can approve anyone's request except your own."
            : "Pending leave requests from your direct reports."
        }
      />
      <Card bodyClassName="pb-0">
        <DataState
          data={pending.data}
          error={pending.error}
          empty={<EmptyState title="You're all caught up">No leave requests are waiting for you.</EmptyState>}
        >
          {(data) => (
            <LeaveRequestTable
              requests={data}
              showEmployee
              actions={(r) => <DecisionButtons request={r} onDecide={setDecision} />}
            />
          )}
        </DataState>
      </Card>
      <DecisionDialog
        decision={decision}
        onClose={() => setDecision(null)}
        onDone={() => {
          setDecision(null);
          pending.reload();
        }}
      />
    </>
  );
}
