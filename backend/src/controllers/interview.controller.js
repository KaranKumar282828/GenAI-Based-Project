const pdfParse = require("pdf-parse")
const { generateInterviewReport, generateResumePdf } = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")


// ✅ LESSON 1: Constants alag rakhte hain — magic numbers code mein nahi likhte
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_MIME_TYPE = "application/pdf"


/**
 * ✅ LESSON 2: Input validate karo PEHLE — 
 * Kabhi bhi user ke input par blindly trust mat karo.
 * Agar file nahi hai, ya galat format hai, ya fields missing hain
 * toh AI call tak pahunchne se pehle hi reject karo.
 * Isse AI ke unnecessary API calls bachte hain (paisa bhi, time bhi)
 */
function validateGenerateReportInput(req) {
    const errors = []

    if (!req.file) {
        errors.push("Resume file is required.")
    } else {
        if (req.file.mimetype !== ALLOWED_MIME_TYPE) {
            errors.push("Only PDF files are allowed.")
        }
        if (req.file.size > MAX_FILE_SIZE_BYTES) {
            errors.push(`File size must be less than ${MAX_FILE_SIZE_MB}MB.`)
        }
    }

    if (!req.body.selfDescription || req.body.selfDescription.trim() === "") {
        errors.push("selfDescription is required.")
    }

    if (!req.body.jobDescription || req.body.jobDescription.trim() === "") {
        errors.push("jobDescription is required.")
    }

    return errors
}


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {

        // ✅ LESSON 3: Pehle validate karo, phir process karo
        const errors = validateGenerateReportInput(req)
        if (errors.length > 0) {
            return res.status(400).json({
                message: "Validation failed.",
                errors  // frontend ko exact errors batao
            })
        }

        // ✅ LESSON 4: PDF parse bhi fail ho sakta hai
        // Agar user ne corrupted PDF bheja toh? try-catch mein hai toh handle ho jayega
        const pdfData = await pdfParse(req.file.buffer)
        const resumeText = pdfData.text

        // ✅ LESSON 5: Extracted text bhi validate karo
        // Empty PDF ya image-only PDF ka text empty hoga
        if (!resumeText || resumeText.trim() === "") {
            return res.status(400).json({
                message: "Could not extract text from the uploaded PDF. Please make sure the PDF contains readable text and is not a scanned image."
            })
        }

        const { selfDescription, jobDescription } = req.body

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription: selfDescription.trim(),
            jobDescription: jobDescription.trim()
        })

        // ✅ LESSON 6: Agar AI ne null ya undefined diya toh bhi handle karo
        if (!interViewReportByAi) {
            return res.status(500).json({
                message: "Failed to generate interview report. Please try again."
            })
        }

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription: selfDescription.trim(),
            jobDescription: jobDescription.trim(),
            ...interViewReportByAi
        })

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } catch (error) {
        // ✅ LESSON 7: Error types ke hisaab se alag response do
        // SyntaxError — AI ne invalid JSON diya
        // ValidationError — Mongoose schema fail hua
        // Baaki sab — generic 500

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
            // ✅ LESSON 8: Production mein error.message user ko mat bhejo
            // Sirf development mein bhejo — sensitive info leak ho sakti hai
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params

        // ✅ LESSON 9: MongoDB ID validate karo — invalid ID se Mongoose crash karta hai
        if (!interviewId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message: "Invalid interview ID format."
            })
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id  // ✅ user ka sirf apna report mile — security
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


/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
            // ✅ LESSON 10: .lean() — plain JS object return karta hai
            // Mongoose document se faster hota hai jab sirf read karna ho
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


/**
 * @description Controller to generate resume PDF based on interview report.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params

        // ✅ MongoDB ID validate karo
        if (!interviewReportId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({
                message: "Invalid interview report ID format."
            })
        }

        const interviewReport = await interviewReportModel
            .findOne({ _id: interviewReportId, user: req.user.id })  // ✅ security check
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
            "Content-Length": pdfBuffer.length  // ✅ browser ko size batao — better download experience
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