const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
 dotenv.config();
const app = express();
const connectDB = require("./config/dbConnect")
const redisClient = require("./config/redis");
app.use(cors());
app.use(cookieParser());
app.use(express.json());
const PORT = process.env.PORT;
const initialiseConnections = async () =>{
    try {
         await Promise.all([connectDB(),  redisClient.connect()]);
    console.log("All connections established");
    app.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    })
    }catch (error) {
        console.error("Error establishing connections:", error);
        process.exit(1);
    }
   
}

initialiseConnections();