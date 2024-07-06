import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import {v4 as uuid} from "uuid"
import {v2 as cloudinary} from "cloudinary"
import { getBase64, getSockets } from "../lib/helper.js";


const connectDB = (url) => {
  mongoose
    .connect(url, { dbName: "chatApp" })
    .then((data) => console.log(`Connected to DB: ${data.connection.host}`))
    .catch((err) => {
      throw err;
    });
};

const sendToken = (res, user, code, message) => {
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);

  return res //ye cookie me jayegi
    .status(code)
    .cookie("chat-token", token, {
      maxAge: 15 * 24 * 60 * 60 * 1000,
      sameSite: "none",
      httpOnly: true,
      secure: true,
    })
    .json({
      success: true,
      user,
      message,
    });
};

const emitEvent = (req, event, users, data) => {
  const io = req.app.get("io");
  const userSocket = getSockets(users);
  io.to(userSocket).emit(event,data);
};

const uploadFilesToCloudinary = async(files=[]) => {
  const uploadPromises = files.map((file)=>{
    return new Promise((resolve, reject)=>{
      cloudinary.uploader.upload(
        getBase64(file),
        {
          resouce_type: "auto",
          public_id: uuid(),
        },
        (error, result) => {
          if(error) return reject(error);
          resolve(result);
        }
      )
    })
  })

  try {
    const results = await Promise.all(uploadPromises);

    const formattedResults = results.map((result)=>({
      public_id: result.public_id,
      url: result.secure_url,
    }));
    return formattedResults
  } catch (error) {
    throw new Error("Erro in uploading files to cloudinary", error)
  }
}

const deleteFilesFromCloudinary = async (public_ids) => {};

export { connectDB, sendToken, emitEvent, deleteFilesFromCloudinary, uploadFilesToCloudinary };
