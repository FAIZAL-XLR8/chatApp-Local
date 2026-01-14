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
const chatRouter = require("./routes/chatRoute");
const {initializeConnection, initializeSocket} = require ("./service/socketService")
const http = require('http');
const statusRoute = require ("./routes/statusRoute")
//Middlewares
const corsOption = {
    origin : process.env.FRONTEND_URL,
    credentials : true,

}
const PORT = process.env.PORT;
app.use(cors(corsOption));
app.use(cookieParser());// token to parse karega json data
app.use(express.json()); //parses bddy ka content to json
app.use(bodyParser.urlencoded({ extended: true }));
const httpserver = http.createServer(app);
const io = initializeSocket(httpserver);

//middleare connect io and userOnline Map 
app.use((req, res, next)=>{
    req.io = io;
    req.socketUserMap = io.socketUserMap;
    next();
})

//routes
app.use("/api/auth", authRouter);
app.use("/api/chat",chatRouter);
app.use("/api/status", statusRoute);



const initialiseConnections = async () =>{
    try {
         await Promise.all([connectDB(),  redisClient.connect()]);
    console.log("All connections established");
    httpserver.listen(PORT, ()=>{
        console.log(`Server is running on port ${PORT}`);
    })
    }catch (error) {
        console.error("Error establishing connections:", error);
        process.exit(1);
    }
   
}

initialiseConnections();