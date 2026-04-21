"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  APPLICATION_STATUSES,
  JobApplication,
  JobMatchResult,
  PaginatedResponse,
  ResumeProfile
} from "@job-tracker/shared-types";
import { useRouter } from "next/navigation";
import { ApplicationsTable } from "@/components/applications-table";
import { apiRequest } from "@/lib/api-client";

type FormState = {
  companyName: string;
  jobTitle: string;
  applicationDate: string;
  status: string;
  sourcePlatform: string;
  location: string;
  workplaceType: string;
  notes: string;
};

type ResumeEditorState = {
  totalYearsExperience: string;
  skillsText: string;
  preferredLocationsText: string;
  workModePreference: "onsite" | "remote" | "hybrid" | "any";
};

const defaultFormState: FormState = {
  companyName: "",
  jobTitle: "",
  applicationDate: new Date().toISOString().slice(0, 10),
  status: "Applied",
  sourcePlatform: "",
  location: "",
  workplaceType: "",
  notes: ""
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<JobApplication[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState<FormState>(defaultFormState);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [resumeEditors, setResumeEditors] = useState<Record<string, ResumeEditorState>>({});
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [uploadingResume, setUploadingResume] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);

  useEffect(() => {
    void verifySession();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void loadApplications(search, statusFilter);
    void loadResumes();
  }, [ready, search, statusFilter]);

  async function verifySession() {
    try {
      await apiRequest<{ id: string; email: string }>("/auth/me", "GET");
      setReady(true);
    } catch {
      router.replace("/login");
    }
  }

  async function loadApplications(searchQuery: string, status: string) {
    const params = new URLSearchParams({
      page: "1",
      limit: "50"
    });
    if (searchQuery) params.set("search", searchQuery);
    if (status) params.set("status", status);

    const response = await apiRequest<PaginatedResponse<JobApplication>>(`/applications?${params.toString()}`, "GET");
    setRows(response.data);
  }

  async function loadResumes() {
    const response = await apiRequest<ResumeProfile[]>("/resumes", "GET");
    setResumes(response);
    setResumeEditors(buildResumeEditors(response));

    const active = response.find((resume) => resume.isActive);
    if (active) {
      setSelectedResumeId(active._id);
    }
  }

  async function uploadResume(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fileInput = document.getElementById("resume-file") as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Please select a resume file first.");
      return;
    }

    setUploadingResume(true);
    setError(null);

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const buffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        await apiRequest<ResumeProfile>("/resumes/upload", "POST", {
          fileName: file.name,
          mimeType: file.type || "application/pdf",
          fileContentBase64: base64
        });
      } else {
        const resumeText = await file.text();
        if (!resumeText || resumeText.trim().length < 30) {
          throw new Error("Resume text is too short. Please upload a detailed resume file.");
        }

        await apiRequest<ResumeProfile>("/resumes/upload", "POST", {
          fileName: file.name,
          mimeType: file.type || "text/plain",
          resumeText
        });
      }

      fileInput.value = "";
      setMessage("Resume uploaded and parsed.");
      await loadResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload resume.");
    } finally {
      setUploadingResume(false);
    }
  }

  async function setActiveResume(id: string) {
    await apiRequest<{ success: boolean }>(`/resumes/${id}/activate`, "PATCH");
    setSelectedResumeId(id);
    await loadResumes();
    setMessage("Active resume updated.");
  }

  async function saveResumeProfile(resumeId: string) {
    const editor = resumeEditors[resumeId];
    if (!editor) return;

    setError(null);

    try {
      await apiRequest<ResumeProfile>(`/resumes/${resumeId}/profile`, "PATCH", {
        totalYearsExperience: Number(editor.totalYearsExperience || 0),
        skills: csvToList(editor.skillsText),
        preferredLocations: csvToList(editor.preferredLocationsText),
        workModePreference: editor.workModePreference
      });

      setMessage("Resume profile updated.");
      await loadResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update resume profile.");
    }
  }

  async function analyzeFit() {
    setError(null);
    setMessage(null);

    if (!selectedResumeId) {
      setError("Upload/select a resume before analyzing fit.");
      return;
    }

    try {
      const result = await apiRequest<JobMatchResult>("/match/score", "POST", {
        resumeId: selectedResumeId,
        jobTitle: form.jobTitle,
        jobDescription: form.notes,
        location: form.location,
        workplaceType: form.workplaceType
      });

      setMatchResult(result);
      setMessage(`Fit analysis complete: ${result.rating} (${result.score}/100)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze fit.");
    }
  }

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      await apiRequest<JobApplication>("/applications", "POST", {
        ...form,
        applicationDate: new Date(form.applicationDate).toISOString()
      });

      setForm(defaultFormState);
      setMessage("Application saved");
      await loadApplications(search, statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application");
    }
  }

  async function deleteApplication(id: string) {
    await apiRequest<{ success: boolean }>(`/applications/${id}`, "DELETE");
    setMessage("Application deleted");
    await loadApplications(search, statusFilter);
  }

  async function updateStatus(id: string, status: string) {
    await apiRequest<JobApplication>(`/applications/${id}`, "PATCH", { status });
    await loadApplications(search, statusFilter);
  }

  async function logout() {
    await apiRequest<{ success: boolean }>("/auth/logout", "POST");
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Applications</h1>
          <p className="text-sm text-slate-600">Track your hiring pipeline from one dashboard.</p>
        </div>
        <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Logout
        </button>
      </div>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white/90 p-4">
        <h2 className="font-semibold">Resume Profile</h2>
        <form onSubmit={uploadResume} className="mt-3 flex flex-wrap items-center gap-3">
          <input id="resume-file" type="file" accept=".pdf,.txt,.md,.text" className="text-sm" />
          <button
            type="submit"
            disabled={uploadingResume}
            className="rounded bg-slate-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {uploadingResume ? "Uploading..." : "Upload Resume"}
          </button>
          <span className="text-xs text-slate-500">Supports PDF and text resumes.</span>
        </form>

        {resumes.length ? (
          <div className="mt-3 space-y-2 text-sm">
            {resumes.map((resume) => (
              <div key={resume._id} className="rounded border border-slate-200 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{resume.fileName}</span>
                  {resume.isActive ? (
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">Active</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveResume(resume._id)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                    >
                      Set Active
                    </button>
                  )}
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <label className="text-xs text-slate-600">
                    Total Experience (years)
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={resumeEditors[resume._id]?.totalYearsExperience ?? String(resume.totalYearsExperience)}
                      onChange={(e) =>
                        setResumeEditors((prev) => ({
                          ...prev,
                          [resume._id]: {
                            ...prev[resume._id],
                            totalYearsExperience: e.target.value
                          }
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="text-xs text-slate-600">
                    Preferred Work Mode
                    <select
                      value={resumeEditors[resume._id]?.workModePreference ?? resume.workModePreference}
                      onChange={(e) =>
                        setResumeEditors((prev) => ({
                          ...prev,
                          [resume._id]: {
                            ...prev[resume._id],
                            workModePreference: e.target.value as ResumeEditorState["workModePreference"]
                          }
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    >
                      <option value="any">Any</option>
                      <option value="onsite">Onsite</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </label>

                  <label className="text-xs text-slate-600 md:col-span-2">
                    Key Skills (comma-separated)
                    <input
                      value={resumeEditors[resume._id]?.skillsText ?? resume.skills.join(", ")}
                      onChange={(e) =>
                        setResumeEditors((prev) => ({
                          ...prev,
                          [resume._id]: {
                            ...prev[resume._id],
                            skillsText: e.target.value
                          }
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>

                  <label className="text-xs text-slate-600 md:col-span-2">
                    Preferred Locations (comma-separated)
                    <input
                      value={resumeEditors[resume._id]?.preferredLocationsText ?? resume.preferredLocations.join(", ")}
                      onChange={(e) =>
                        setResumeEditors((prev) => ({
                          ...prev,
                          [resume._id]: {
                            ...prev[resume._id],
                            preferredLocationsText: e.target.value
                          }
                        }))
                      }
                      className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                    />
                  </label>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => saveResumeProfile(resume._id)}
                    className="rounded bg-slate-700 px-2 py-1 text-xs font-semibold text-white"
                  >
                    Update Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">No resume uploaded yet.</p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white/90 p-4">
        <h2 className="font-semibold">Add Application</h2>
        <form onSubmit={createApplication} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            required
            placeholder="Company"
            value={form.companyName}
            onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <input
            required
            placeholder="Job title"
            value={form.jobTitle}
            onChange={(e) => setForm((prev) => ({ ...prev, jobTitle: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <input
            type="date"
            required
            value={form.applicationDate}
            onChange={(e) => setForm((prev) => ({ ...prev, applicationDate: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            placeholder="Platform"
            value={form.sourcePlatform}
            onChange={(e) => setForm((prev) => ({ ...prev, sourcePlatform: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <input
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          />
          <select
            value={form.workplaceType}
            onChange={(e) => setForm((prev) => ({ ...prev, workplaceType: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">Work mode</option>
            <option value="onsite">Onsite</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            className="rounded border border-slate-300 px-3 py-2 md:col-span-2"
          />
          <button className="rounded bg-accent px-3 py-2 font-semibold text-white md:self-start">
            Save Application
          </button>
          <button
            type="button"
            onClick={analyzeFit}
            className="rounded bg-slate-800 px-3 py-2 font-semibold text-white md:self-start"
          >
            Analyze Fit
          </button>
        </form>

        {matchResult ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="font-semibold">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${matchRatingStyles(matchResult.rating)}`}
              >
                {matchResult.rating}
              </span>
              <span className="ml-2">{matchResult.score}/100</span>
            </p>
            <p className="mt-1 text-slate-600">
              Skill {matchResult.breakdown.skill}% | Experience {matchResult.breakdown.experience}% | Location {matchResult.breakdown.location}%
            </p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Reasons</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
              {(matchResult.reasons.length ? matchResult.reasons : ["No explicit reasons were generated."]).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Search company/title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded border border-slate-300 px-3 py-2"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="">All statuses</option>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <ApplicationsTable rows={rows} onDelete={deleteApplication} onStatusChange={updateStatus} />
      </section>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-accent">{message}</p> : null}
    </main>
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildResumeEditors(resumes: ResumeProfile[]): Record<string, ResumeEditorState> {
  return resumes.reduce<Record<string, ResumeEditorState>>((acc, resume) => {
    acc[resume._id] = {
      totalYearsExperience: String(resume.totalYearsExperience),
      skillsText: resume.skills.join(", "),
      preferredLocationsText: resume.preferredLocations.join(", "),
      workModePreference: resume.workModePreference
    };

    return acc;
  }, {});
}

function matchRatingStyles(rating: JobMatchResult["rating"]) {
  if (rating === "Strong Match") return "bg-emerald-100 text-emerald-800";
  if (rating === "Good Match") return "bg-blue-100 text-blue-800";
  if (rating === "Weak Match") return "bg-amber-100 text-amber-800";
  return "bg-rose-100 text-rose-800";
}
