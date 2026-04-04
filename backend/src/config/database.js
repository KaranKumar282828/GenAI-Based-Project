const mongoose = require("mongoose")


async function connectToDB() {
    try {
        /**
         * ✅ LESSON 47: Mongoose connection options
         * serverSelectionTimeoutMS — agar MongoDB mil nahi raha
         * toh 5 second mein fail karo, hang mat karo
         * socketTimeoutMS — query zyada time le rahi hai
         * toh 45 second mein timeout karo
         */
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        })

        console.log("✅ Connected to Database")

        /**
         * ✅ LESSON 48: Connection events monitor karo
         * Production mein pata chalna chahiye kab DB disconnect hua
         */
        mongoose.connection.on("disconnected", () => {
            console.warn("⚠️ MongoDB disconnected.")
        })

        mongoose.connection.on("error", (err) => {
            console.error("MongoDB connection error:", err)
        })

    } catch (err) {
        console.error("❌ Failed to connect to Database:", err.message)
        // ✅ LESSON 49: DB connect na ho toh server start mat karo
        // server.js mein graceful shutdown handle karega
        throw err
    }
}

module.exports = connectToDB