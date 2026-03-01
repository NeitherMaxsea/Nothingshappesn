import { useState } from "react";
import Swal from "sweetalert2";
import "../../designer/admin_job_post_page.css";

type FormState = {
  title: string;
  companyName: string;
  description: string;
  category: string;
  type: string;
  location: string;
  barangay: string;
  setup: string;
  vacancies: string;
  salaryMin: string;
  salaryMax: string;
  disabilityType: string;
  preferredAgeRange: string;
  language: string;
  qualifications: string;
  responsibilities: string;
};

const DISABILITY_OPTIONS = [
  "PWD-friendly",
  "Visual Impairment",
  "Hearing Impairment",
  "Speech and Language Impairment",
  "Physical Disability / Orthopedic",
  "Psychosocial Disability",
  "Intellectual Disability",
  "Learning Disability",
  "Autism Spectrum Disorder",
  "Chronic Illness",
  "Multiple Disabilities",
];

const AGE_RANGE_OPTIONS = [
  "18 - 25 years old",
  "20 - 30 years old",
  "20 - 35 years old",
  "25 - 40 years old",
  "18 - 60 years old",
];

const LANGUAGE_OPTIONS = ["English", "Filipino", "English, Filipino", "Filipino, English, Taglish"];

const DASMA_BARANGAYS = [
  "Burol I",
  "Burol II",
  "Burol III",
  "Burol Main",
  "Datu Esmael",
  "Emmanuel Bergado I",
  "Emmanuel Bergado II",
  "Fatima I",
  "Fatima II",
  "Fatima III",
  "H-2",
  "Langkaan I",
  "Langkaan II",
  "Luzviminda I",
  "Luzviminda II",
  "Paliparan I",
  "Paliparan II",
  "Paliparan III",
  "Salawag",
  "Salitran I",
  "Salitran II",
  "Salitran III",
  "Salitran IV",
  "Sampaloc I",
  "Sampaloc II",
  "Sampaloc III",
  "Sampaloc IV",
  "San Agustin I",
  "San Agustin II",
  "San Agustin III",
  "San Andres I",
  "San Andres II",
  "San Andres III",
  "San Antonio de Padua I",
  "San Antonio de Padua II",
  "San Dionisio",
  "San Esteban",
  "San Francisco I",
  "San Francisco II",
  "San Isidro Labrador I",
  "San Isidro Labrador II",
  "San Isidro Labrador III",
  "San Jose",
  "San Juan",
  "San Lorenzo Ruiz I",
  "San Lorenzo Ruiz II",
  "San Luis I",
  "San Luis II",
  "San Manuel I",
  "San Manuel II",
  "San Mateo",
  "San Miguel",
  "San Nicolas I",
  "San Nicolas II",
  "San Roque",
  "Santa Cristina I",
  "Santa Cristina II",
  "Santa Cruz I",
  "Santa Cruz II",
  "Santa Fe",
  "Santa Lucia",
  "Santa Maria",
  "Santo Cristo",
  "Santo Nino I",
  "Santo Nino II",
  "Victoria Reyes",
  "Zone I",
  "Zone I-A",
  "Zone I-B",
  "Zone II",
  "Zone III",
  "Zone IV",
];

const initialForm: FormState = {
  title: "",
  companyName: "",
  description: "",
  category: "",
  type: "Full-time",
  location: "Dasmarinas City",
  barangay: "Salawag",
  setup: "On-site",
  vacancies: "1",
  salaryMin: "19000",
  salaryMax: "25000",
  disabilityType: "PWD-friendly",
  preferredAgeRange: "20 - 35 years old",
  language: "English, Filipino",
  qualifications: "",
  responsibilities: "",
};

const LOCAL_JOB_POSTS_KEY = "adminLocalJobPosts";

export default function AdminJobPostPage(): React.JSX.Element {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.companyName.trim() || !form.description.trim()) {
      await Swal.fire({
        icon: "warning",
        title: "Missing fields",
        text: "Please fill Title, Company, and Description.",
        confirmButtonText: "OK",
      });
      return;
    }

    const salaryMin = Math.max(0, Number(form.salaryMin || 0));
    const salaryMax = Math.max(salaryMin, Number(form.salaryMax || salaryMin));

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        companyName: form.companyName.trim(),
        description: form.description.trim(),
        category: form.category.trim() || "General",
        type: form.type.trim() || "Full-time",
        location: `Dasmarinas City, ${form.barangay.trim()}`,
        city: "Dasmarinas City",
        barangay: form.barangay.trim(),
        setup: form.setup.trim() || "On-site",
        vacancies: Math.max(1, Number(form.vacancies || 1)),
        salary: `${salaryMin} - ${salaryMax}`,
        salaryMin,
        salaryMax,
        disabilityType: form.disabilityType.trim() || "PWD-friendly",
        preferredAgeRange: form.preferredAgeRange.trim() || "18 - 60 years old",
        languages: [form.language],
        qualifications: form.qualifications
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        responsibilities: form.responsibilities
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        status: "open",
        createdAt: new Date().toISOString(),
      };

      let postedViaApi = false;
      try {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        postedViaApi = res.ok;
      } catch {
        postedViaApi = false;
      }

      if (!postedViaApi) {
        const localJob = {
          ...payload,
          id: `local-job-${Date.now()}`,
          __localOnly: true,
        };
        const prevRaw = localStorage.getItem(LOCAL_JOB_POSTS_KEY);
        const prev = prevRaw ? (JSON.parse(prevRaw) as Array<Record<string, unknown>>) : [];
        localStorage.setItem(LOCAL_JOB_POSTS_KEY, JSON.stringify([localJob, ...prev].slice(0, 100)));
      }

      await Swal.fire({
        icon: "success",
        title: "Job posted",
        text: postedViaApi
          ? "Your job post is now saved and should appear on landing page feeds."
          : "Saved locally (test mode). It will still appear on landing page in this browser.",
        confirmButtonText: "OK",
      });

      setForm(initialForm);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to post job.";
      await Swal.fire({
        icon: "error",
        title: "Post failed",
        text: msg,
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-job-post-page">
      <div className="job-post-header">
        <h2>Job Post</h2>
        <p>Create a new job opening for landing page and applicant feeds.</p>
      </div>

      <form className="job-post-form" onSubmit={submit}>
        <div className="job-post-grid two">
          <label>
            Job Title
            <input value={form.title} onChange={(e) => onChange("title", e.target.value)} placeholder="Data Encoder" />
          </label>
          <label>
            Company Name
            <input value={form.companyName} onChange={(e) => onChange("companyName", e.target.value)} placeholder="HireAble Inc." />
          </label>
        </div>

        <label>
          Description
          <textarea value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="Describe the role..." rows={4} />
        </label>

        <div className="job-post-grid three">
          <label>
            Category
            <input value={form.category} onChange={(e) => onChange("category", e.target.value)} placeholder="Administrative" />
          </label>
          <label>
            Type
            <select value={form.type} onChange={(e) => onChange("type", e.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </label>
          <label>
            Setup
            <select value={form.setup} onChange={(e) => onChange("setup", e.target.value)}>
              <option>On-site</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
          </label>
        </div>

        <div className="job-post-grid three">
          <label>
            Location
            <input value={form.location} readOnly />
          </label>
          <label>
            Barangay (Dasmarinas)
            <select value={form.barangay} onChange={(e) => onChange("barangay", e.target.value)}>
              {DASMA_BARANGAYS.map((brgy) => (
                <option key={brgy} value={brgy}>
                  {brgy}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vacancies
            <input type="number" min={1} value={form.vacancies} onChange={(e) => onChange("vacancies", e.target.value)} />
          </label>
        </div>

        <div className="job-post-grid three">
          <label>
            Disability Fit
            <select value={form.disabilityType} onChange={(e) => onChange("disabilityType", e.target.value)}>
              {DISABILITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferred Age
            <select value={form.preferredAgeRange} onChange={(e) => onChange("preferredAgeRange", e.target.value)}>
              {AGE_RANGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <label>
            Language
            <select value={form.language} onChange={(e) => onChange("language", e.target.value)}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Salary Range
          <div className="job-post-range">
            <input type="number" min={0} value={form.salaryMin} onChange={(e) => onChange("salaryMin", e.target.value)} placeholder="19000" />
            <span>-</span>
            <input type="number" min={0} value={form.salaryMax} onChange={(e) => onChange("salaryMax", e.target.value)} placeholder="25000" />
          </div>
        </label>

        <div className="job-post-grid two">
          <label>
            Qualifications (one per line)
            <textarea rows={5} value={form.qualifications} onChange={(e) => onChange("qualifications", e.target.value)} placeholder={"Basic computer literacy\nAttention to detail"} />
          </label>
          <label>
            Responsibilities (one per line)
            <textarea rows={5} value={form.responsibilities} onChange={(e) => onChange("responsibilities", e.target.value)} placeholder={"Encode and verify records\nCoordinate with admin team"} />
          </label>
        </div>

        <div className="job-post-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
