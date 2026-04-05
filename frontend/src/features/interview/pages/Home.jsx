import { useState, useRef } from "react"
import "../style/home.scss"
import { useInterview } from "../hooks/useInterview.js"
import { useNavigate } from "react-router"


const Home = () => {

    const { generatingReport, fetchingReports, generateReport, reports, error } = useInterview()

    const [ jobDescription, setJobDescription ] = useState("")
    const [ selfDescription, setSelfDescription ] = useState("")
    const [ jobDescCharCount, setJobDescCharCount ] = useState(0)
    const [ validationError, setValidationError ] = useState(null)
    const [ selectedFileName, setSelectedFileName ] = useState(null)

    const resumeInputRef = useRef()
    const navigate = useNavigate()


    const validate = () => {
        if (!jobDescription.trim()) {
            setValidationError("Job description is required.")
            return false
        }

        const hasResume = resumeInputRef.current?.files?.[0]
        const hasSelfDescription = selfDescription.trim().length > 0

        if (!hasResume && !hasSelfDescription) {
            setValidationError("Please upload a resume or provide a self description.")
            return false
        }

        setValidationError(null)
        return true
    }


    const handleGenerateReport = async () => {
        if (!validate()) return

        const resumeFile = resumeInputRef.current?.files?.[0]
        const data = await generateReport({ jobDescription, selfDescription, resumeFile })

        if (data?._id) {
            navigate(`/interview/${data._id}`)
        }
    }


    return (
        <div className="home-page">

            {/* ✅ Reports fetch hote waqt top pe loading bar */}
            {fetchingReports && (
                <div className="loading-bar">
                    <div className="loading-bar__fill" />
                </div>
            )}

            {/* ✅ AI Generate hote waqt full overlay — page visible rahe */}
            {generatingReport && (
                <div className="generating-overlay">
                    <div className="generating-overlay__box">
                        <div className="spinner-lg" />
                        <h3>Analyzing your profile...</h3>
                        <p>AI is generating your personalized interview strategy</p>
                        <p className="generating-overlay__time">⏱ This may take 20-30 seconds</p>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <header className="page-header">
                <h1>Create Your Custom <span className="highlight">Interview Plan</span></h1>
                <p>Let our AI analyze the job requirements and your unique profile to build a winning strategy.</p>
            </header>

            {/* Error Banner */}
            {(error || validationError) && (
                <div className="error-banner">
                    {validationError || error}
                </div>
            )}

            {/* Main Card */}
            <div className="interview-card">
                <div className="interview-card__body">

                    {/* Left Panel - Job Description */}
                    <div className="panel panel--left">
                        <div className="panel__header">
                            <span className="panel__icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className="badge badge--required">Required</span>
                        </div>
                        <textarea
                            onChange={(e) => {
                                setJobDescription(e.target.value)
                                setJobDescCharCount(e.target.value.length)
                                if (validationError) setValidationError(null)
                            }}
                            value={jobDescription}
                            className="panel__textarea"
                            placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
                            maxLength={5000}
                            // ✅ Generating hote waqt disable
                            disabled={generatingReport}
                        />
                        <div className={`char-counter ${jobDescCharCount >= 4500 ? "char-counter--warning" : ""}`}>
                            {jobDescCharCount} / 5000 chars
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="panel-divider" />

                    {/* Right Panel - Profile */}
                    <div className="panel panel--right">
                        <div className="panel__header">
                            <span className="panel__icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Your Profile</h2>
                        </div>

                        {/* Upload Resume */}
                        <div className="upload-section">
                            <label className="section-label">
                                Upload Resume
                                <span className="badge badge--best">Best Results</span>
                            </label>
                            <label className="dropzone" htmlFor="resume">
                                <span className="dropzone__icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                </span>

                                {selectedFileName ? (
                                    <>
                                        <p className="dropzone__title dropzone__title--selected">
                                            ✓ {selectedFileName}
                                        </p>
                                        <p className="dropzone__subtitle">Click to change file</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="dropzone__title">Click to upload or drag &amp; drop</p>
                                        <p className="dropzone__subtitle">PDF only (Max 5MB)</p>
                                    </>
                                )}

                                <input
                                    onChange={(e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            setSelectedFileName(file.name)
                                            if (validationError) setValidationError(null)
                                        }
                                    }}
                                    ref={resumeInputRef}
                                    hidden
                                    type="file"
                                    id="resume"
                                    name="resume"
                                    accept=".pdf"
                                    disabled={generatingReport}
                                />
                            </label>
                        </div>

                        {/* OR Divider */}
                        <div className="or-divider"><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className="self-description">
                            <label className="section-label" htmlFor="selfDescription">Quick Self-Description</label>
                            <textarea
                                onChange={(e) => {
                                    setSelfDescription(e.target.value)
                                    if (validationError) setValidationError(null)
                                }}
                                value={selfDescription}
                                id="selfDescription"
                                name="selfDescription"
                                className="panel__textarea panel__textarea--short"
                                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                                disabled={generatingReport}
                            />
                        </div>

                        {/* Info Box */}
                        <div className="info-box">
                            <span className="info-box__icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume</strong> or a <strong>Self Description</strong> is required to generate a personalized plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className="interview-card__footer">
                    <span className="footer-info">AI-Powered Strategy Generation &bull; Approx 30s</span>
                    {/* ✅ generatingReport use karo — loading nahi */}
                    <button
                        onClick={handleGenerateReport}
                        disabled={generatingReport}
                        className="generate-btn">
                        {generatingReport ? (
                            <>
                                <div className="spinner-sm" />
                                Analyzing...
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                                Generate My Interview Strategy
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Recent Reports */}
            {reports.length > 0 && (
                <section className="recent-reports">
                    <h2>My Recent Interview Plans</h2>
                    <ul className="reports-list">
                        {reports.map(report => (
                            <li
                                key={report._id}
                                className="report-item"
                                onClick={() => navigate(`/interview/${report._id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === "Enter" && navigate(`/interview/${report._id}`)}
                            >
                                <h3>{report.title || "Untitled Position"}</h3>
                                <p className="report-meta">
                                    Generated on {new Date(report.createdAt).toLocaleDateString()}
                                </p>
                                <p className={`match-score ${report.matchScore >= 80 ? "score--high" : report.matchScore >= 60 ? "score--mid" : "score--low"}`}>
                                    Match Score: {report.matchScore}%
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Page Footer */}
            <footer className="page-footer">
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
                <a href="#">Help Center</a>
            </footer>
        </div>
    )
}

export default Home