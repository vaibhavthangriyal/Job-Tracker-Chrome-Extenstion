"use client";

import { APPLICATION_STATUSES, JobApplication } from "@job-tracker/shared-types";

type Props = {
  rows: JobApplication[];
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
};

export function ApplicationsTable({ rows, onDelete, onStatusChange }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/90">
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-slate-100 text-left text-slate-700">
          <tr>
            <th className="px-3 py-2">Company</th>
            <th className="px-3 py-2">Job Title</th>
            <th className="px-3 py-2">Platform</th>
            <th className="px-3 py-2">Work Mode</th>
            <th className="px-3 py-2">Tech / Skills</th>
            <th className="px-3 py-2">Applied Date</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id} className="border-t border-slate-100">
              <td className="px-3 py-2">{row.companyName}</td>
              <td className="px-3 py-2">{row.jobTitle}</td>
              <td className="px-3 py-2">{row.sourcePlatform ?? "-"}</td>
              <td className="px-3 py-2">{row.workplaceType ?? "-"}</td>
              <td className="px-3 py-2">{row.tags?.length ? row.tags.join(", ") : "-"}</td>
              <td className="px-3 py-2">{new Date(row.applicationDate).toLocaleDateString()}</td>
              <td className="px-3 py-2">
                <select
                  className="rounded border border-slate-300 px-2 py-1"
                  value={row.status}
                  onChange={(e) => row._id && onStatusChange(row._id, e.target.value)}
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => row._id && onDelete(row._id)}
                  className="rounded bg-red-50 px-2 py-1 text-red-700"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td className="px-3 py-6 text-center text-slate-500" colSpan={8}>
                No applications yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
