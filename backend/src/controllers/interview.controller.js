const PDFParser = require("pdf2json")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")


const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_MIME_TYPE = "application/pdf"


const extractTextFromPdf = (buffer) => {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser()

        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            const safeDecodeURI = (str) => {
                try {
                    return decodeURIComponent(str)
                } catch {
                    return str
                }
            }

            const text = pdfData.Pages.map(page =>
                page.Texts.map(t =>
                    safeDecodeURI(t.R.map(r => r.T).join(""))
                ).join(" ")
            ).join("\n")

            resolve(text)
        })

        pdfParser.on("pdfParser_dataError", (err) => {
            reject(new Error("Failed to parse PDF: " + err.parserError))
        })

        pdfParser.parseBuffer(buffer)
    })
}


// ✅ Resume OR selfDescription — koi ek hona chahiye
function validateGenerateReportInput(req) {
    const errors = []

    const hasResume = req.file && req.file.size > 0
    const hasSelfDescription = req.body.selfDescription &&
                               req.body.selfDescription.trim() !== ""

    // ✅ File validation — sirf tab jab file upload ki ho
    if (hasResume) {
        if (req.file.mimetype !== ALLOWED_MIME_TYPE) {
            errors.push("Only PDF files are allowed.")
        }
        if (req.file.size > MAX_FILE_SIZE_BYTES) {
            errors.push(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
        }
    }

    // ✅ Resume ya selfDescription — koi ek toh hona chahiye
    if (!hasResume && !hasSelfDescription) {
        errors.push("Please upload a resume or provide a self description.")
    }

    if (!req.body.jobDescription || req.body.jobDescription.trim() === "") {
        errors.push("jobDescription is required.")
    }

    return errors
}


async function generateInterViewReportController(req, res) {
    try {
        const errors = validateGenerateReportInput(req)
        if (errors.length > 0) {
            return res.status(400).json({
                message: "Validation failed.",
                errors
            })
        }

        const { selfDescription, jobDescription } = req.body
        let resumeText = ""

        // ✅ Sirf tab PDF parse karo jab file upload ki ho
        if (req.file) {
            resumeText = await extractTextFromPdf(req.file.buffer)

            if (!resumeText || resumeText.trim() === "") {
                return res.status(400).json({
                    message: "Could not extract text from the uploaded PDF. Please make sure the PDF contains readable text and is not a scanned image."
                })
            }
        }

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription?.trim() || "",
            jobDescription: jobDescription.trim()
        })

        if (!interViewReportByAi) {
            return res.status(500).json({
                message: "Failed to generate interview report. Please try again."
            })
        }

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: selfDescription?.trim() || "",
            jobDescription: jobDescription.trim(),
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {
        console.error("generateInterViewReportController Error:", error)

        if (error.name === "SyntaxError") {
            return res.status(500).json({
                message: "AI returned an invalid response. Please try again."
            })
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                message: "Data validation failed.",
                errors: Object.values(error.errors).map(e => e.message)
            })
        }

        res.status(500).json({
            message: "Failed to generate interview report.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        if (!interviewId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message: "Invalid interview ID format."
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id
        })

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport
        })

    } catch (error) {
        console.error("getInterviewReportByIdController Error:", error)
        res.status(500).json({
            message: "Failed to fetch interview report.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
            .lean()

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        })

    } catch (error) {
        console.error("getAllInterviewReportsController Error:", error)
        res.status(500).json({
            message: "Failed to fetch interview reports.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        if (!interviewReportId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message: "Invalid interview report ID format."
            })
        }

        const interviewReport = await interviewReportModel
            .findOne({ _id: interviewReportId, user: req.user.id })
            .lean()

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        const { resume, jobDescription, selfDescription } = interviewReport

        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })

        if (!pdfBuffer) {
            return res.status(500).json({
                message: "Failed to generate PDF. Please try again."
            })
        }

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
            "Content-Length": pdfBuffer.length
        })

        res.send(pdfBuffer)

    } catch (error) {
        console.error("generateResumePdfController Error:", error)
        res.status(500).json({
            message: "Failed to generate resume PDF.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}