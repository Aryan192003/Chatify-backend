import express from "express";
import {
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
  login,
  logout,
  profile,
  searchUser,
  sendFriendRequest,
  signup,
} from "../controllers/user.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validate,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { multerUpload } from "../middlewares/multer.js";

const app = express.Router();

app.post(
  "/new",
  multerUpload.single("avatar"),
  registerValidator(),
  validate,
  signup
);
app.post("/login", loginValidator(), validate, login);

//after here user must be logged in
app.use(isAuthenticated);
app.get("/profile", profile);
app.get("/logout", logout);
app.get("/search", searchUser);
app.put("/sendrequest", sendRequestValidator(), validate, sendFriendRequest);
app.put(
  "/acceptrequest",
  acceptRequestValidator(),
  validate,
  acceptFriendRequest
);

app.get("/notifications", getAllNotifications);
app.get("/friends", getMyFriends);

export default app;
