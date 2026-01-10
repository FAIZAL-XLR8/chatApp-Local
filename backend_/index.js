const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
 dotenv.config();
const app = express();
const connectDB = require("./config/dbConnect")
const redisClient = require("./config/redis");
const bodyParser = require('body-parser');
const authRouter = require("./routes/authRoute");
//Middlewares
app.use(cors());
app.use(cookieParser());// token to parse karega json data
app.use(express.json()); //parses bddy ka content to json
app.use(bodyParser.urlencoded({ extended: true }));

//routes
app.use("/api/auth", authRouter);



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