require("dotenv").config(); // load environment variables from .env file
const app = require("./src/app");
const connectToDB = require("./src/config/database");


app.listen(3000, () => {
    connectToDB(); // connect to the database when the server starts
    console.log("Server is running on port 3000");
})