const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")


// ✅ LESSON 11: App start hote hi env variables check karo
// Agar key nahi hai toh runtime pe pata chalega — bahut bura hoga
// Startup pe hi crash karo taaki pata chal jaye
if (!process.env.GOOGLE_GENAI_API_KEY) {
    throw new Error("GOOGLE_GENAI_API_KEY is missing in environment variables. Please set it in your .env file.")
}

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})


// ✅ LESSON 12: Constants — ek jagah se model change karna easy ho
const AI_MODEL = "gemini-2.0-flash"
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day"),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day")
    })).describe("A day-wise preparation plan for the candidate"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})


/**
 * ✅ LESSON 13: Retry logic kyun zaroori hai?
 * AI APIs kabhi kabhi temporarily fail ho jaati hain — network hiccup, rate limit, timeout
 * Retry karne se ye failures automatically recover ho jaati hain
 * Exponential backoff — pehle 1s wait, phir 2s, phir 3s — server ko recover karne ka time dete hain
 */
async function withRetry(fn, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn()
        } catch (error) {
            const isLastAttempt = attempt === retries

            // ✅ Kuch errors pe retry karna fayda nahi — jaise invalid API key
            // Sirf temporary errors pe retry karo
            const isRetryable = error.message?.includes("503") ||
                error.message?.includes("429") ||  // rate limit
                error.message?.includes("timeout")

            if (isLastAttempt || !isRetryable) {
                throw error
            }

            const delay = RETRY_DELAY_MS * attempt  // 1s, 2s, 3s
            console.warn(`AI API attempt ${attempt} failed. Retrying in ${delay}ms...`)
            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}


async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`

    // ✅ LESSON 14: Retry ke saath AI call karo
    const response = await withRetry(() =>
        ai.models.generateContent({
            model: AI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(interviewReportSchema),
            }
        })
    )

    // ✅ LESSON 15: AI response validate karo Zod se
    // AI kabhi kabhi schema se alag response de sakti hai
    // safeParse — throw nahi karta, success/error object deta hai
    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch {
        throw new Error("AI returned invalid JSON response.")
    }

    const validated = interviewReportSchema.safeParse(parsed)
    if (!validated.success) {
        console.error("AI response validation failed:", validated.error.flatten())
        throw new Error("AI returned an unexpected response structure.")
    }

    return validated.data
}


/**
 * ✅ LESSON 16: Puppeteer production config
 * --no-sandbox: Linux servers pe sandbox support nahi hoti
 * --disable-setuid-sandbox: Same reason
 * --disable-dev-shm-usage: Docker/Linux pe /dev/shm chhota hota hai — crash hota hai iske bina
 */
async function generatePdfFromHtml(htmlContent) {
    let browser = null  // ✅ finally mein close karne ke liye bahar declare karo

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",  // ✅ Docker pe zaroori
                "--disable-gpu"             // ✅ Server pe GPU nahi hoti
            ]
        })

        const page = await browser.newPage()

        // ✅ LESSON 17: Timeout set karo — agar page load nahi hua toh hang mat karo
        await page.setContent(htmlContent, {
            waitUntil: "networkidle0",
            timeout: 30000  // 30 seconds
        })

        const pdfBuffer = await page.pdf({
            format: "A4",
            margin: {
                top: "20mm",
                bottom: "20mm",
                left: "15mm",
                right: "15mm"
            },
            printBackground: true  // ✅ Background colors bhi print ho
        })

        return pdfBuffer

    } finally {
        // ✅ LESSON 18: Browser hamesha close karo — memory leak rokta hai
        // finally mein isliye kyunki error aane par bhi close hona chahiye
        if (browser) {
            await browser.close()
        }
    }
}


async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume")
    })

    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity.
                    `

    const response = await withRetry(() =>
        ai.models.generateContent({
            model: AI_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: zodToJsonSchema(resumePdfSchema),
            }
        })
    )

    let parsed
    try {
        parsed = JSON.parse(response.text)
    } catch {
        throw new Error("AI returned invalid JSON response for resume.")
    }

    const validated = resumePdfSchema.safeParse(parsed)
    if (!validated.success) {
        throw new Error("AI returned an unexpected response structure for resume.")
    }

    const pdfBuffer = await generatePdfFromHtml(validated.data.html)
    return pdfBuffer
}


module.exports = { generateInterviewReport, generateResumePdf }