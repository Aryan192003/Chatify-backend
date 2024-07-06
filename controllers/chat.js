import {
  ALERT,
  NEW_ATTACHMENT,
  NEW_MESSAGE,
  NEW_MESSAGE_ALERT,
  REFETCH_CHATS,
} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";

const newGroupChat = async (req, res, next) => {
  try {
    const { name, members } = req.body;

    if (members.length < 2) {
      return next({
        message: "Group chat must have atlest 2 memebers",
        statusCode: 400,
      });
    }

    const allMembers = [...members, req.user];

    await Chat.create({
      name,
      groupChat: true,
      creator: req.user,
      members: allMembers,
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);
    return res.status(201).json({
      success: true,
      message: "Group created",
    });
  } catch (error) {
    next(error);
  }
};

const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ members: req.user }).populate(
      "members",
      "name avatar"
    );

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
      const otherMember = getOtherMember(members, req.user);

      return {
        _id,
        groupChat,
        avatar: groupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        name: groupChat ? name : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    });

    return res.status(200).json({
      success: true,
      chats: transformedChats,
    });
  } catch (error) {
    next(error);
  }
};

const getMyGroups = async (req, res, next) => {
  try {
    const chats = await Chat.find({
      members: req.user,
      groupChat: true,
      creator: req.user,
    }).populate("members", "name avatar");

    const groups = chats.map(({ members, _id, groupChat, name }) => ({
      _id,
      groupChat,
      name,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    }));

    return res.status(200).json({
      success: true,
      groups,
    });
  } catch (error) {
    next(error);
  }
};

const addMembers = async (req, res, next) => {
  
  try {
    
    const { chatId, members } = req.body;

    if (!members || members.length < 1) {
      return next({ message: "Please provide members", statusCode: 400 });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next({ message: "Chat not found", statusCode: 404 });
    }
    if (!chat.groupChat) {
      return next({ message: "This is not a group chat", statusCode: 400 });
    }
    if (chat.creator.toString() !== req.user.toString()) {
      return next({
        message: "You are not allowed to add members",
        statusCode: 400,
      });
    }

    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers
      .filter((i) => !chat.members.includes(i._id.toString()))
      .map((i) => i._id);

    chat.members.push(...uniqueMembers);

    

    if (chat.members.length > 100) {
      return next({
        message: "Max limit of group members reached",
        statusCode: 400,
      });
    }
    await chat.save();

    const allUsersName = allNewMembers.map((i) => i.name).join(", ");

    emitEvent(
      req,
      ALERT,
      chat.members,
      `${allUsersName} has been added in the group`
    );

    emitEvent(req, REFETCH_CHATS, chat.members);
    
    return res.status(200).json({
      success: true,
      message: "Users added successfully",
    });
  } catch (error) {
    
    next(error);
  }
};

const removeMembers = async (req, res, next) => {
  try {
    const { userId, chatId } = req.body;
    const [chat, userThatWillBeRemoved] = await Promise.all([
      Chat.findById(chatId),
      User.findById(userId, "name"),
    ]);

    if (!chat) {
      return next({ message: "Chat not found", statusCode: 404 });
    }
    if (!chat.groupChat) {
      return next({ message: "This is not a group chat", statusCode: 400 });
    }
    if (chat.creator.toString() !== req.user.toString()) {
      return next({
        message: "You are not allowed to add members",
        statusCode: 400,
      });
    }

    if (chat.members.length <= 3) {
      return next({ message: "Group must have 3 members", statusCode: 400 });
    }

    const allChatMembers = chat.members.map((i)=> i.toString());

    chat.members = chat.members.filter(
      (member) => member.toString() !== userId.toString()
    );

    await chat.save();

    emitEvent(
      req,
      ALERT,
      chat.members,
      {message:`${userThatWillBeRemoved} has been removed from the group`, chatId}
    );

    emitEvent(req, REFETCH_CHATS, allChatMembers);

    return res.status(200).json({
      success: true,
      message: "member removed successfully",
    });
  } catch (error) {
    next(error);
  }
};

const leaveGroup = async (req, res, next) => {
  const chatId = req.params.id;
  const chat = await Chat.findById(chatId);

  if (!chat) {
    return next({ message: "Chat not found", statusCode: 404 });
  }
  if (!chat.groupChat) {
    return next({ message: "This is not a group chat", statusCode: 400 });
  }
  if (chat.members.length <= 3) {
    return next({ message: "Group must have 3 members", statusCode: 400 });
  }

  
  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (chat.creator.toString() === req.user.toString()) {
    const newCreator = remainingMembers[0];

    chat.creator = newCreator;
  }
  chat.members = remainingMembers;
  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {message:`${userThatWillBeRemoved} has been removed from the group`, chatId});

  return res.status(200).json({
    success: true,
    message: "member removed successfully",
  });
};

const sendAttachments = async (req, res, next) => {
  try {
    const { chatId } = req.body;

    const [chat, me] = await Promise.all([
      Chat.findById(chatId),
      User.findById(req.user, "name"),
    ]);

    if (!chat) {
      return next({ message: "Chat not found", statusCode: 404 });
    }

    const files = req.files || [];
    if (files.length < 1) {
      return next({ message: "Provide attachments", statusCode: 400 });
    }
    if (files.length > 5) {
      return next({
        message: "Attachments should be less than 5",
        statusCode: 400,
      });
    }
    const attachments = await uploadFilesToCloudinary(files);
    const messageForRealTime = {
      content: "",
      attachments,
      sender: {
        _id: me._id,
        name: me.name,
      },
      chat: chatId,
    };
    const messageForDB = {
      content: "",
      attachments,
      sender: me._id,
      chat: chatId,
    };

    
    const message = await Message.create(messageForDB);

    emitEvent(req, NEW_MESSAGE, chat.members, {
      message: messageForRealTime,
      chatId,
    });
  
    emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });
    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

const getChatDetails = async (req, res, next) => {
  try {
    if (req.query.populate === "true") {
      const chat = await Chat.findById(req.params.id)
        .populate("members", "name avatar")
        .lean(); //lean ke karan ye ek javascripy ka object ban jayega

      if (!chat) {
        return next({ message: "Chat not found", statusCode: 404 });
      }
      chat.members = chat.members.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
      }));
      return res.status(200).json({
        success: true,
        chat,
      });
    } else {
      const chat = await Chat.findById(req.params.id);
      if (!chat) {
        return next({ message: "Chat not found", statusCode: 404 });
      }
      return res.status(200).json({
        success: true,
        chat,
      });
    }
  } catch (error) {
    next(error);
  }
};

const renameGroup = async (req, res, next) => {
  const chatId = req.params.id;
  const { name } = req.body;

  const chat = await Chat.findById(chatId);

  if (!chat) {
    return next({ message: "Chat not found", statusCode: 404 });
  }

  if (!chat.groupChat) {
    return next({ message: "This is not a group chat", statusCode: 400 });
  }

  if (chat.creator.toString() !== req.user.toString()) {
    return next({
      message: "You are not allowed to rename the group",
      statusCode: 400,
    });
  }

  chat.name = name;

  await chat.save();

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Group name changed successfully",
  });
};

const deleteChat = async (req, res, next) => {
  try {
    const chatId = req.params.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next({ message: "Chat not found", statusCode: 404 });
    }

    const members = chat.members;

    if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
      return next({
        message: "You are not allowed to delete the group",
        statusCode: 400,
      });
    }

    if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
      return next({
        message: "You are not allowed to delete the chat",
        statusCode: 403,
      });
    }

    const messagesWithAttachments = await Message.find({
      chat: chatId,
      attachments: { $exists: true, $ne: [] },
    });

    const public_ids = [];

    messagesWithAttachments.forEach(({ attachments }) =>
      attachments.forEach(({ public_id }) => public_ids.push(public_id))
    );

    await Promise.all([
      deleteFilesFromCloudinary(public_ids),
      chat.deleteOne(),
      Message.deleteMany({ chat: chatId }),
    ]);

    emitEvent(req, REFETCH_CHATS, members);

    return res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const chatId = req.params.id;
    const { page = 1 } = req.query;

    const chat = Chat.findById(chatId);
    
    if (!chat) return next({
      message: "You are not allowed to read the chat",
      statusCode: 403,
    });

    // if(!chat.members.includes(req.user.toString())){
    //   return next({
    //     message: "You are not allowed to read the chat",
    //     statusCode: 403,
    //   })
    // }

    const limit = 20;
    const skip = (page - 1) * limit;

    const [messages, totalMessagesCount] = await Promise.all([
      Message.find({ chat: chatId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "name avatar")
        .lean(),
      Message.countDocuments({ chat: chatId }),
    ]);

    const totalPages = Math.ceil(totalMessagesCount / limit);

    return res.status(200).json({
      success: true,
      message: messages.reverse(),
      totalPages,
    });
  } catch (error) {
    next(error);
  }
};
export {
  newGroupChat,
  getMyChats,
  getMyGroups,
  addMembers,
  removeMembers,
  leaveGroup,
  sendAttachments,
  getChatDetails,
  renameGroup,
  deleteChat,
  getMessages,
};
