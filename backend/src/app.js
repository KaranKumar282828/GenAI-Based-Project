const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const helmet = require("helmet")

const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : [ "http://localhost:5173" ]

// ✅ CORS pehle lagao — helmet se pehle!
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
        } else {
            callback(new Error(`CORS blocked: Origin ${origin} is not allowed.`))
        }
    },
    credentials: true
}))

// ✅ Helmet baad mein — aur crossOriginResourcePolicy disable karo
app.use(helmet({
    crossOriginResourcePolicy: false,       // ✅ CORS requests block nahi karega
    crossOriginOpenerPolicy: false,         // ✅ Cross origin requests allow karega
    contentSecurityPolicy: false,           // ✅ Development mein off rakho
}))

app.use(express.json({ limit: "10kb" }))
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(cookieParser())

// ✅ Custom sanitizer
app.use((req, res, next) => {
    if (req.body) {
        const sanitize = (obj) => {
            if (typeof obj !== "object" || obj === null) return obj
            for (const key in obj) {
                if (key.startsWith("$")) {
                    delete obj[key]
                } else if (typeof obj[key] === "object") {
                    sanitize(obj[key])
                }
            }
        }
        sanitize(req.body)
    }
    next()
})

// ✅ Health endpoint
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

app.use((req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.originalUrl} not found.`
    })
})

app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err)

    if (err.message?.startsWith("CORS blocked")) {
        return res.status(403).json({ message: err.message })
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON in request body." })
    }

    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Request body too large. Maximum size is 10kb." })
    }

    res.status(err.status || 500).json({
        message: err.message || "Internal server error.",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    })
})

module.exports = app