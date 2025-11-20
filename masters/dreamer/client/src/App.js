"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./index.css";

export default function JobMatcherPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [desiredJob, setDesiredJob] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("desiredJob", desiredJob);

    try {
      const res = await fetch("http://localhost:4000/upload-resume", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="container">
      <h1 className="title">Resume Radar</h1>

      <form onSubmit={handleSubmit} className="card">
        <div className="formGroup">
          <label className="label">Upload Your Resume</label>

          {/* Hidden input */}
          <input
            id="resume-upload"
            type="file"
            className="hidden-file-input"
            onChange={(e) => setResumeFile(e.target.files[0])}
          />

          {/* Styled Dropzone Button */}
          <div
            className="upload-box"
            onClick={() => document.getElementById("resume-upload").click()}
          >
            {!resumeFile && (
              <>
                <div className="upload-icon">📄</div>
                <p className="upload-text">Click to upload your resume</p>
                <p className="upload-sub">PDF - Max 5MB</p>
              </>
            )}

            {resumeFile && (
              <>
                <div className="upload-icon">✅</div>
                <p className="upload-text">{resumeFile.name}</p>
                <p className="upload-change">Click to change file</p>
              </>
            )}
          </div>
        </div>

        <div className="formGroup">
          <label className="label">Desired Job</label>
          <input
            className="input"
            value={desiredJob}
            onChange={(e) => setDesiredJob(e.target.value)}
            placeholder="e.g. Product Manager, Software Engineer..."
          />
        </div>

        <button type="submit" className="button" disabled={loading}>
          {loading ? "Analyzing…" : "Analyze Resume"}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {/* 🟢 NEW FORMATTED RESULTS DISPLAY */}
      {result && <FormattedResults result={result} />}
    </div>
  );
}

/* ------------------------
   COMPONENT: Formatted Output 
------------------------ */
function FormattedResults({ result }) {
  // Parse resumeQuality if it's a stringified JSON
  let quality = result.resumeQuality;
  if (typeof quality === "string") {
    try {
      quality = JSON.parse(
        quality
          .trim()
          .replace(/^```json\s*/, "")
          .replace(/```$/, "")
      );
    } catch {
      quality = {};
    }
  }

  // Helper: Extract JSON block from highFitAdvice
  function extractJsonBlock(text) {
    const match = text.match(/```json\s*([\s\S]*?)```/);
    return match ? match[1] : null;
  }

  // ⭐ EARLY EXIT FOR INCOMPLETE RESUME
  if (
    result.resumeQuality &&
    !result.lowFitAdvice &&
    !result.mediumFitAdvice &&
    !result.highFitAdvice
  ) {
    return (
      <div className="resultCard">
        <h2 className="resultTitle">Results</h2>
        <Section title="Resume Quality" color="yellow">
          <ReactMarkdown>
            {quality.explanation
              ? `**Explanation:**\n${quality.explanation}`
              : "No explanation available."}
          </ReactMarkdown>
          {quality.recommendations &&
            Array.isArray(quality.recommendations) && (
              <ReactMarkdown>
                {`**Recommendations:**\n${quality.recommendations
                  .map((r) => `- ${r}`)
                  .join("\n")}`}
              </ReactMarkdown>
            )}
        </Section>
      </div>
    );
  }

  // ⭐ If the resume is complete → show normal results
  return (
    <div className="resultCard">
      <h2 className="resultTitle">Results</h2>

      {/* Summary */}
      {result.summary && (
        <Section title="Job Match Summary" color="blue">
          <ReactMarkdown>{result.summary}</ReactMarkdown>
        </Section>
      )}

      {/* Low Fit */}
      {result.lowFitAdvice && (
        <Section title="Low Fit Advice" color="red">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.lowFitAdvice}
          </ReactMarkdown>
        </Section>
      )}

      {/* Medium Fit */}
      {result.mediumFitAdvice && (
        <Section title="Medium Fit Advice" color="orange">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.mediumFitAdvice}
          </ReactMarkdown>
        </Section>
      )}

      {/* High Fit */}
      {result.highFitAdvice && (
        <Section title="High Fit Advice" color="green">
          {/* Render everything except the JSON block as markdown */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.highFitAdvice.replace(/```json[\s\S]*?```/, "")}
          </ReactMarkdown>
          {/* Render the JSON block as formatted code if present */}
          {extractJsonBlock(result.highFitAdvice) && (
            <pre className="json-block">
              {extractJsonBlock(result.highFitAdvice)}
            </pre>
          )}
        </Section>
      )}

      {/* Always show Resume Recommendations if available */}
      {quality.recommendations && Array.isArray(quality.recommendations) && (
        <Section title="Resume Recommendations" color="yellow">
          <ReactMarkdown>
            {quality.recommendations.map((r) => `- ${r}`).join("\n")}
          </ReactMarkdown>
        </Section>
      )}
    </div>
  );
}

/* ------------------------
   COMPONENT: Reusable Section Box 
------------------------ */
function Section({ title, color, children }) {
  const colorClasses = {
    red: "bg-red-50 border-red-300",
    yellow: "bg-yellow-50 border-yellow-300",
    orange: "bg-orange-50 border-orange-300",
    green: "bg-green-50 border-green-300",
    blue: "bg-blue-50 border-blue-300",
  };

  return (
    <div className={`p-4 rounded-xl border mt-4 ${colorClasses[color]}`}>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <div className="markdown-body">{children}</div>
    </div>
  );
}
