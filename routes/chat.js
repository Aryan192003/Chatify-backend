import express from "express";
import {
  addMembers,
  deleteChat,
  getChatDetails,
  getMessages,
  getMyChats,
  getMyGroups,
  leaveGroup,
  newGroupChat,
  removeMembers,
  renameGroup,
  sendAttachments,
} from "../controllers/chat.js";
import {
  addMemberValidator,
  getMessagesValidator,
  leaveGroupValidator,
  newGroupChatValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachmentValidator,
  validate,
} from "../lib/validators.js";
import { isAuthenticated } from "../middlewares/auth.js";
import { attachmentsMulter } from "../middlewares/multer.js";

const app = express.Router();

//after here user must be logged in
app.use(isAuthenticated);

app.post("/new", newGroupChatValidator(), validate, newGroupChat);
app.get("/my", getMyChats);

app.get("/my/groups", getMyGroups);

app.put("/addmembers", addMemberValidator(), validate, addMembers);
app.put("/removemember", removeMemberValidator(), validate, removeMembers);

app.delete("/leave/:id", leaveGroupValidator(), validate, leaveGroup);

app.post(
  "/message",
  attachmentsMulter,
  sendAttachmentValidator(),
  validate,
  sendAttachments
);

app.get("/message/:id", getMessagesValidator(), validate, getMessages);

app
  .route("/:id")
  .get(getMessagesValidator(), validate, getChatDetails)
  .put(renameValidator(), validate, renameGroup)
  .delete(getMessagesValidator(), validate, deleteChat);
export default app;
