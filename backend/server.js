require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/config/database")


/**
 * ✅ LESSON 43: Env variables pehle validate karo
 * Agar koi zaroori variable missing hai toh
 * server start hi mat hone do — better than runtime crash
 */
const REQUIRED_ENV_VARS = [
    "GOOGLE_GENAI_API_KEY",
    "MONGO_URI",
    "JWT_SECRET",
    "NODE_ENV"
]

const missingVars = REQUIRED_ENV_VARS.filter(key => !process.env[key])
if (missingVars.length > 0) {
    console.error("Missing required environment variables:", missingVars.join(", "))
    process.exit(1)  // ✅ Server start mat karo
}


const PORT = process.env.PORT || 3000


/**
 * ✅ LESSON 44: Pehle DB connect karo, phir server start karo
 * Agar DB connect nahi hua aur server start ho gaya
 * toh requests aayengi aur DB errors aayengi
 * Sequence sahi rakho
 */
const startServer = async () => {
    try {
        await connectToDB()
        console.log("✅ Database connected successfully.")

        const server = app.listen(PORT, () => {
            console.log(`✅ Server is running on port ${PORT} in ${process.env.NODE_ENV} mode`)
        })


        /**
         * ✅ LESSON 45: Graceful Shutdown
         * Jab server band ho (CTRL+C ya deployment update)
         * toh existing requests complete hone do
         * phir database connection close karo
         * Abrupt shutdown se data corrupt ho sakta hai
         */
        const gracefulShutdown = (signal) => {
            console.log(`\n${signal} received. Shutting down gracefully...`)
            server.close(async () => {
                console.log("✅ HTTP server closed.")
                const mongoose = require("mongoose")
                await mongoose.connection.close()
                console.log("✅ Database connection closed.")
                process.exit(0)
            })

            // ✅ Agar 10 seconds mein graceful shutdown na ho toh force close
            setTimeout(() => {
                console.error("Could not close connections in time, forcefully shutting down.")
                process.exit(1)
            }, 10000)
        }

        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))  // Deployment/Docker stop
        process.on("SIGINT", () => gracefulShutdown("SIGINT"))    // CTRL+C


        /**
         * ✅ LESSON 46: Unhandled Errors — Last Safety Net
         * Koi bhi Promise reject ho aur catch na ho
         * Ya koi unexpected error aaye
         * Toh crash hone se pehle log karo
         */
        process.on("unhandledRejection", (reason) => {
            console.error("Unhandled Promise Rejection:", reason)
            gracefulShutdown("unhandledRejection")
        })

        process.on("uncaughtException", (error) => {
            console.error("Uncaught Exception:", error)
            gracefulShutdown("uncaughtException")
        })

    } catch (error) {
        console.error("Failed to start server:", error)
        process.exit(1)
    }
}

startServer()