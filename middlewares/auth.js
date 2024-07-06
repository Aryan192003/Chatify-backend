import jwt from "jsonwebtoken";
import { User } from "../models/user.js";

const isAuthenticated = async (req, res, next) => {
  const token = req.cookies["chat-token"];
  if (!token) {
    return next({
      message: "Please login to access this route",
      statusCode: 401,
    });
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET); // ye check karega ki token shi hai ya nhi

  req.user = decodedData._id; // isse sabhi age wale functions me (req) me ye id chai jayegi
  next();
};

const socketAuthenticator = async(error, socket, next) => {
  try {
    if(error) return next(error);
    const authToken = socket.request.cookies["chat-token"];
    if(!authToken){
      return next({
        message: "Please login to access this route",
        statusCode: 401,
      });
    }

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if(!user){
      return next({
        message: "Please login to access this route",
        statusCode: 401,
      });
    }
    socket.user = user;
    return next();

  } catch (error) {
    console.log(error)
    return next({
      message: "Please login to access this route",
      statusCode: 401,
    });
  }
};

export { isAuthenticated, socketAuthenticator };
