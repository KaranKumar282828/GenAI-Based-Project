// this file is the entry point of our application. It sets up the Express server and defines the middleware and routes for our API.

const express = require("express");
const cookieParser = require("cookie-parser");


const app = express();


app.use(express.json()); // middlewaere to parse JSON request bodies
app.use(cookieParser()); // middleware to parse cookies from incoming requests

//  require all the routes here
const authRouter = require("./routes/auth.routes");


// using all the routes here
app.use("/api/auth", authRouter)



module.exports = app;