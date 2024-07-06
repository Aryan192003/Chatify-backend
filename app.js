import express from "express";

import { connectDB } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import { v4 as uuid } from "uuid";
import cors from 'cors'
import {v2 as cloudinary } from 'cloudinary'

import userRoute from "./routes/user.js";
import chatRoute from "./routes/chat.js";
import { createUser } from "./seeders/user.js";
import {
  createGroupChats,
  createMessagesInAChat,
  createSingleChats,
} from "./seeders/chat.js";
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import { Message } from "./models/message.js";
import { corsOption } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";

dotenv.config({
  path: "./.env",
});

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: corsOption
}); //yaha pe socket setup kiya hai

app.set("io",io);

app.use(express.json());
app.use(cookieParser()); //iske bina cookie access ni kar payenge
app.use(cors(corsOption))  //CORS ki problem solve karta hai

const userSocketIDs = new Map(); //isme currently active users hai

const onlineUsers = new Set();

connectDB(process.env.MONGO_URL);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

app.use("/api/v1/user", userRoute);
app.use("/api/v1/chat", chatRoute);

app.get("/", (req, res) => {
  res.send("Hello World");
});

io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res, async(error)=>{
    socketAuthenticator(error, socket, next)
  })
}); //yha be middleware use kar skte hai socket ke liye

io.on("connection", (socket) => {
  
  const user = socket.user;
  userSocketIDs.set(user._id.toString(), socket.id); // socket id me iser id ko set kar diya
  socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
    
    const messageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: user._id,
        name: user.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDB = {
      content: message,
      sender: user._id,
      chat: chatId,
    };
    
    const membersSocket = getSockets(members); //isme wo honge jis jis ko message bhejna hai
    io.to(membersSocket).emit(NEW_MESSAGE, {
      chatId,
      message: messageForRealTime,
    });
    io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId }); // isse 2messages , 3 messages dikha dega
    //iske alawa bhi kar skte the jisme ek room bana lenge and jstne bhi us room me honge sabke pass message jayega
    try {
      await Message.create(messageForDB);
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(CHAT_JOINED, ({ userId, members }) => {
    onlineUsers.add(userId.toString());
    
    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on(CHAT_LEAVED, ({ userId, members }) => {
    onlineUsers.delete(userId.toString());

    const membersSocket = getSockets(members);
    io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
  });

  socket.on("disconnect", () => {
    
    userSocketIDs.delete(user._id.toString());
    onlineUsers.delete(user._id.toString());
    socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
  });
});

app.use(errorMiddleware); //ye sabse neeche isliye hai taaki ye last me call ho aur ye fir singup/login function ke baad apne aap next ke through call hoga

server.listen(3000, () => {
  console.log(`Server is running on port: 3000 in ${process.env.NODE_ENV}`);
});

export { userSocketIDs };
