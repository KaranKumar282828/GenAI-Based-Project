const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const tokenBlacklistModel = require("../models/blacklist.model")


/**
 * ✅ LESSON 50: Cookie options — Sabse Important Security Fix!
 * Abhi cookie bilkul unsafe thi:
 * httpOnly: true   — JS se cookie access nahi hogi (XSS attack rokta hai)
 * secure: true     — sirf HTTPS pe cookie jayegi (production mein)
 * sameSite: strict — CSRF attacks rokta hai
 */
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000  // ✅ 1 din — JWT expiry ke saath sync
}


/**
 * ✅ LESSON 51: Input validation helper
 * Email format aur password strength validate karo
 * Bina iske koi bhi garbage data bhej sakta hai
 */
function validateRegisterInput({ username, email, password }) {
    const errors = []

    if (!username || username.trim().length < 3) {
        errors.push("Username must be at least 3 characters long.")
    }

    if (username && username.trim().length > 30) {
        errors.push("Username must be at most 30 characters long.")
    }

    // ✅ Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        errors.push("Please provide a valid email address.")
    }

    if (!password || password.length < 8) {
        errors.push("Password must be at least 8 characters long.")
    }

    return errors
}

function validateLoginInput({ email, password }) {
    const errors = []

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
        errors.push("Please provide a valid email address.")
    }

    if (!password) {
        errors.push("Password is required.")
    }

    return errors
}


/**
 * @name registerUserController
 * @description Register a new user
 * @access Public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password } = req.body

        // ✅ Pehle validate karo
        const errors = validateRegisterInput({ username, email, password })
        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors })
        }

        const isUserAlreadyExists = await userModel.findOne({
            $or: [
                { username: username.trim() },
                { email: email.toLowerCase().trim() }
            ]
        })

        if (isUserAlreadyExists) {
            return res.status(400).json({
                message: "Account already exists with this email address or username."
            })
        }

        const hash = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: hash
        })

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        // ✅ Secure cookie options
        res.cookie("token", token, COOKIE_OPTIONS)

        res.status(201).json({
            message: "User registered successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })

    } catch (error) {
        console.error("registerUserController Error:", error)

        // ✅ LESSON 52: Mongoose duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Account already exists with this email or username."
            })
        }

        res.status(500).json({
            message: "Failed to register user. Please try again.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


/**
 * @name loginUserController
 * @description Login a user
 * @access Public
 */
async function loginUserController(req, res) {
    try {
        const { email, password } = req.body

        // ✅ Pehle validate karo
        const errors = validateLoginInput({ email, password })
        if (errors.length > 0) {
            return res.status(400).json({ message: "Validation failed.", errors })
        }

        const user = await userModel.findOne({
            email: email.toLowerCase().trim()
        })

        /**
         * ✅ LESSON 53: Timing attack rokna
         * Agar user nahi mila toh bhi bcrypt.compare chalao
         * Warna hacker timing se pata laga sakta hai
         * ki email exist karti hai ya nahi
         */
        const dummyHash = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234"
        const isPasswordValid = await bcrypt.compare(
            password,
            user ? user.password : dummyHash
        )

        if (!user || !isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password."
            })
        }

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.cookie("token", token, COOKIE_OPTIONS)

        res.status(200).json({
            message: "User logged in successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })

    } catch (error) {
        console.error("loginUserController Error:", error)
        res.status(500).json({
            message: "Failed to login. Please try again.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


/**
 * @name logoutUserController
 * @description Logout user — token blacklist karo
 * @access Private
 */
async function logoutUserController(req, res) {
    try {
        const token = req.cookies.token

        if (token) {
            await tokenBlacklistModel.create({ token })
        }

        res.clearCookie("token", COOKIE_OPTIONS)

        res.status(200).json({
            message: "User logged out successfully."
        })

    } catch (error) {
        console.error("logoutUserController Error:", error)
        res.status(500).json({
            message: "Failed to logout. Please try again.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


/**
 * @name getMeController
 * @description Get current logged in user details
 * @access Private
 */
async function getMeController(req, res) {
    try {
        const user = await userModel
            .findById(req.user.id)
            .select("-password -__v")   // ✅ Password kabhi response mein mat bhejo
            .lean()                      // ✅ Read only hai — lean() fast hai

        // ✅ LESSON 54: User exist na kare toh handle karo
        // Token valid hai lekin user delete ho gaya ho toh?
        if (!user) {
            return res.status(404).json({
                message: "User not found."
            })
        }

        res.status(200).json({
            message: "User details fetched successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })

    } catch (error) {
        console.error("getMeController Error:", error)
        res.status(500).json({
            message: "Failed to fetch user details.",
            ...(process.env.NODE_ENV === "development" && { error: error.message })
        })
    }
}


module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}