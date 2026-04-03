// this file is the entry point of our application. It sets up the Express server and defines the middleware and routes for our API.

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");


const app = express();
app.use(cors({
    origin: "http://localhost:5173", // allow requests from this origin
    credentials: true // allow cookies to be sent with requests
}));

app.use(express.json()); // middleware to parse JSON request bodies
app.use(cookieParser()); // middleware to parse cookies from incoming requests

//  require all the routes here
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes")


// using all the routes here
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)



module.exports = app;