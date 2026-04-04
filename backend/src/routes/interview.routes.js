const express = require("express")
const rateLimit = require("express-rate-limit")
const authMiddleware = require("../middlewares/auth.middleware")
const interviewController = require("../controllers/interview.controller")
const uploadPdf = require("../middlewares/file.middleware")

const interviewRouter = express.Router()


/**
 * ✅ LESSON 29: Rate Limiting kyun zaroori hai?
 * AI API calls bahut expensive hain — ek call ka matlab hai:
 * 1. Google Gemini API ka paisa
 * 2. Server ka CPU/memory
 * 3. Database write
 * Bina rate limit ke koi bhi unlimited calls kar sakta hai
 * Isliye per user limit lagao
 */
const generateReportLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour window
    max: 10,                    // 1 hour mein sirf 10 reports generate kar sakta hai ek user
    keyGenerator: (req) => req.user?.id || req.ip,  // ✅ User ID se track karo, IP se nahi
    // ✅ LESSON 30: Standard rate limit headers — frontend ko pata chale kitne requests bache hain
    standardHeaders: true,   // RateLimit-Remaining, RateLimit-Reset headers bhejo
    legacyHeaders: false,    // purane X-RateLimit headers band karo
    message: {
        message: "Too many interview reports generated. You can generate up to 10 reports per hour. Please try again later."
    },
    // ✅ LESSON 31: Skip karo agar user already authenticated nahi hai
    // Auth middleware pehle chalega — agar auth fail hua toh rate limit count mat karo
    skip: (req) => !req.user
})

const getReportLimiter = rateLimit({
    windowMs: 60 * 1000,    // 1 minute window
    max: 30,                // 1 minute mein 30 GET requests
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many requests. Please slow down and try again after a minute."
    },
    skip: (req) => !req.user
})

const pdfLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour window
    max: 10,                    // 1 hour mein sirf 10 PDFs generate kar sakta hai
    keyGenerator: (req) => req.user?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many PDF generation requests. You can generate up to 10 PDFs per hour. Please try again later."
    },
    skip: (req) => !req.user
})


/**
 * @route POST /api/interview/
 * @description Generate new interview report
 * @access Private
 *
 * ✅ LESSON 32: Middleware order bahut important hai
 * 1. authMiddleware   — pehle user verify karo
 * 2. generateReportLimiter — phir rate limit check karo (user ID se)
 * 3. uploadPdf        — phir file validate karo
 * 4. controller       — sab theek hai toh kaam karo
 *
 * Agar order galat ho — jaise file pehle upload ho aur phir auth fail ho
 * toh unnecessary processing hogi
 */
interviewRouter.post(
    "/",
    authMiddleware.authUser,
    generateReportLimiter,
    uploadPdf("resume"),    // ✅ Naya wrapper middleware — clean errors deta hai
    interviewController.generateInterViewReportController
)


/**
 * @route GET /api/interview/report/:interviewId
 * @description Get interview report by interviewId
 * @access Private
 */
interviewRouter.get(
    "/report/:interviewId",
    authMiddleware.authUser,
    getReportLimiter,
    interviewController.getInterviewReportByIdController
)


/**
 * @route GET /api/interview/
 * @description Get all interview reports of logged in user
 * @access Private
 */
interviewRouter.get(
    "/",
    authMiddleware.authUser,
    getReportLimiter,
    interviewController.getAllInterviewReportsController
)


/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 * @description Generate resume PDF
 * @access Private
 */
interviewRouter.post(
    "/resume/pdf/:interviewReportId",
    authMiddleware.authUser,
    pdfLimiter,
    interviewController.generateResumePdfController
)


module.exports = interviewRouter