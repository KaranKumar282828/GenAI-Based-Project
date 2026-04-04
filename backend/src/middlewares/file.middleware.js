const multer = require("multer")


// ✅ LESSON 23: File size controller ke saath sync mein rakho
// Controller mein bhi 5MB check tha — dono same hone chahiye
// Ek jagah change karo toh dono update ho
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
const ALLOWED_MIME_TYPES = [ "application/pdf" ]
const ALLOWED_EXTENSIONS = [ ".pdf" ]


/**
 * ✅ LESSON 24: fileFilter kyun zaroori hai?
 * Sirf fileSize limit se kaam nahi chalta —
 * koi bhi .exe, .js, .sh file rename karke .pdf kar sakta hai
 * fileFilter dono cheez check karta hai:
 * 1. MIME type — browser jo batata hai
 * 2. Extension — actual file name
 * Dono check karo tab safe hai
 */
const fileFilter = (req, file, cb) => {
    const ext = "." + file.originalname.split(".").pop().toLowerCase()

    const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype)
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext)

    if (isMimeAllowed && isExtAllowed) {
        cb(null, true)  // ✅ File accept karo
    } else {
        // ✅ LESSON 25: cb mein Error pass karo — multer isko handle karta hai
        cb(new Error(`Invalid file type. Only PDF files are allowed. Received: ${file.mimetype}`), false)
    }
}


const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_FILE_SIZE_BYTES,  // ✅ 5MB
        files: 1                         // ✅ LESSON 26: Ek baar mein sirf 1 file — extra files reject
    },
    fileFilter                           // ✅ File type validation
})


/**
 * ✅ LESSON 27: Multer errors custom handle karo
 * Multer ke errors generic hote hain — user ko samajh nahi aata
 * Wrapper banao jo clean error response de
 *
 * Usage in routes:
 * router.post("/", authMiddleware, uploadPdf("resume"), generateInterViewReportController)
 */
const uploadPdf = (fieldName) => (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
        if (!err) return next()  // ✅ Koi error nahi — aage jao

        // ✅ LESSON 28: Multer error types
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
            })
        }

        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                message: "Too many files. Only 1 file is allowed per request."
            })
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                message: `Unexpected file field. Expected field name: "${fieldName}".`
            })
        }

        // fileFilter ne reject kiya
        if (err.message.startsWith("Invalid file type")) {
            return res.status(400).json({
                message: err.message
            })
        }

        // ✅ Baaki unknown errors
        return res.status(500).json({
            message: "File upload failed. Please try again."
        })
    })
}


module.exports = uploadPdf