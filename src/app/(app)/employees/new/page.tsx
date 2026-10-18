"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { EmployeeForm } from "@/components/EmployeeForm";
import { HrOnly } from "@/components/HrOnly";
import { PageHeader } from "@/components/ui";
import { useToast } from "@/components/session";

export default function NewEmployeePage() {
  const router = useRouter();
  const toast = useToast();

  return (
    <HrOnly>
      <Link href="/employees" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-900">
        ← Employees
      </Link>
      <PageHeader
        title="Add employee"
        description="Leave balances for every active leave type are created automatically."
      />
      <EmployeeForm
        submitLabel="Create employee"
        onCancel={() => router.push("/employees")}
        onSubmit={async (payload) => {
          const created = await api<Employee>("/employees", { body: payload });
          toast(`${created.fullName} added`);
          router.push(`/employees/${created.id}`);
        }}
      />
    </HrOnly>
  );
}
