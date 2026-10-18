"use client";

import Link from "next/link";
import { useState } from "react";
import { useApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Department, Employee, Page } from "@/lib/types";
import { HrOnly } from "@/components/HrOnly";
import {
  Avatar,
  Badge,
  Card,
  DataState,
  EmptyState,
  LinkButton,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";

export default function EmployeesPage() {
  return (
    <HrOnly>
      <EmployeeList />
    </HrOnly>
  );
}

function EmployeeList() {
  const [page, setPage] = useState(0);
  const [departmentId, setDepartmentId] = useState("");
  const [sort, setSort] = useState("firstName");
  const departments = useApi<Department[]>("/departments");
  const employees = useApi<Page<Employee>>("/employees", { page, size: 20, sort, departmentId });

  return (
    <>
      <PageHeader
        title="Employees"
        description="Everyone in your company."
        actions={<LinkButton href="/employees/new">Add employee</LinkButton>}
      />
      <Card bodyClassName="pb-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value);
              setPage(0);
            }}
            className="w-auto min-w-48"
            aria-label="Department"
          >
            <option value="">All departments</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
            className="w-auto"
            aria-label="Sort by"
          >
            <option value="firstName">Sort by first name</option>
            <option value="lastName">Sort by last name</option>
            <option value="joinDate,desc">Newest joiners first</option>
            <option value="employeeCode">Sort by employee code</option>
          </Select>
        </div>
        <DataState
          data={employees.data}
          error={employees.error}
          isEmpty={(d) => d.content.length === 0}
          empty={
            <EmptyState title="No employees found">
              {departmentId ? "Nobody is in this department yet." : "Add your first employee to get started."}
            </EmptyState>
          }
        >
          {(data) => (
            <>
              <Table>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Name</Th>
                    <Th>Code</Th>
                    <Th>Designation</Th>
                    <Th>Department</Th>
                    <Th>Manager</Th>
                    <Th>Joined</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.content.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <Td>
                        <Link href={`/employees/${e.id}`} className="flex items-center gap-3">
                          <Avatar name={e.fullName} />
                          <span className="min-w-0">
                            <span className="block font-medium whitespace-nowrap text-slate-900">{e.fullName}</span>
                            <span className="block text-xs text-slate-500">{e.email}</span>
                          </span>
                        </Link>
                      </Td>
                      <Td className="font-mono text-xs whitespace-nowrap">{e.employeeCode}</Td>
                      <Td>{e.designation || "—"}</Td>
                      <Td>{e.departmentName || "—"}</Td>
                      <Td className="whitespace-nowrap">{e.managerName || "—"}</Td>
                      <Td className="whitespace-nowrap">{formatDate(e.joinDate)}</Td>
                      <Td>
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={e.status} />
                          {!e.hasLogin && <Badge>No login</Badge>}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Pagination
                page={data.page.number}
                totalPages={data.page.totalPages}
                totalElements={data.page.totalElements}
                onChange={setPage}
              />
            </>
          )}
        </DataState>
      </Card>
    </>
  );
}
