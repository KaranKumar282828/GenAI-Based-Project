const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")
const mongoSanitize = require("express-mongo-sanitize")

const app = express()


/**
 * ✅ LESSON 37: Helmet — Security Headers
 * Ye automatically important HTTP security headers lagata hai jaise:
 * - X-Content-Type-Options: browser ko MIME sniffing se rokta hai
 * - X-Frame-Options: clickjacking attacks rokta hai
 * - Strict-Transport-Security: HTTPS enforce karta hai
 * Ek line mein bahut saari security milti hai
 */
app.use(helmet())


/**
 * ✅ LESSON 38: CORS — Sahi tarike se configure karo
 * Production mein hardcode mat karo origin
 * Environment variable se lo
 */
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")  // "http://localhost:5173,https://myapp.com"
    : [ "http://localhost:5173" ]              // fallback for development

app.use(cors({
    origin: (origin, callback) => {
        // ✅ Postman/server-to-server calls allow karo (origin undefined hoti hai)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`))
        }
    },
    credentials: true
}))


/**
 * ✅ LESSON 39: Request size limit
 * Bina limit ke koi bhi bahut bada JSON body bhej sakta hai
 * Server crash ho sakta hai — DOS attack possible hai
 */
app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(cookieParser())


/**
 * ✅ LESSON 40: MongoDB Injection Sanitization
 * Agar koi request body mein ye bheje:
 * { "email": { "$gt": "" } }
 * Toh MongoDB query hack ho sakti hai
 * mongoSanitize ye $ aur . characters remove kar deta hai
 */
app.use(mongoSanitize())


/* Routes */
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)


/**
 * ✅ LESSON 41: 404 Handler
 * Koi bhi unknown route hit kare toh clean response do
 * Bina iske Express ka default ugly HTML error aata hai
 */
app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found.`
    })
})


/**
 * ✅ LESSON 42: Global Error Handler — Sabse Important!
 * Ye Express ka special middleware hai — 4 parameters hote hain (err, req, res, next)
 * Kisi bhi route ya middleware mein agar next(error) call ho
 * ya koi unhandled error aaye toh yahan aata hai
 * Production mein ek jagah se saare errors handle hote hain
 */
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err)

    // ✅ CORS error
    if (err.message?.startsWith("CORS blocked")) {
        return res.status(403).json({ message: err.message })
    }

    // ✅ JSON parse error — invalid JSON body bheja
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON in request body." })
    }

    // ✅ Request size limit exceed
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body too large. Maximum size is 10kb." })
    }

    // ✅ Baaki sab errors
    res.status(err.status || 500).json({
        message: err.message || "Internal server error.",
        // Development mein stack trace dikhao, production mein nahi
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    })
})


module.exports = app