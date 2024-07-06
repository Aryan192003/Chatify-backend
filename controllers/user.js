import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { User } from "../models/user.js";
import { emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js";

const signup = async (req, res, next) => {
  try {
    const { name, username, password, bio } = req.body;

    const file = req.file;
    
    if (!file) return next({ message: "Please upload file", statusCode: 404 });

    const result = await uploadFilesToCloudinary([file])
    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    };
    const user = await User.create({
      name,
      username,
      password,
      bio,
      avatar,
    });

    sendToken(res, user, 201, "User created");
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username }).select("+password");
    if (!user) {
      return next({ message: "Invalid username or password", statusCode: 404 });
    }
    const isMatched = await compare(password, user.password); //ye hahed and normal password ko compare karta hai
    if (!isMatched) {
      return next({ message: "Invalid username or password", statusCode: 404 });
    }
    sendToken(res, user, 200, "Welcome back");
  } catch (error) {
    next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user);
    if(!user) return next("User not found")
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    res.clearCookie("chat-token");
    res.status(200).json({
      success: true,
      message: "User loged Out successfully",
    });
  } catch (error) {
    next(error);
  }
};

const searchUser = async (req, res) => {
  const { name = "" } = req.query;

  
  const myChats = await Chat.find({ groupChat: false, members: req.user });

  const allUserFromMyChats = myChats.flatMap((chat) => chat.members);

  const allUsersExceptMeandFriends = await User.find({
    _id: { $nin: allUserFromMyChats },
    name: { $regex: name, $options: "i" },
  });

  const users = allUsersExceptMeandFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));
  return res.status(200).json({
    success: true,
    users,
  });
};

const sendFriendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const request = await Request.findOne({
      $or: [
        { sender: req.user, receiver: userId },
        { sender: userId, receiver: req.user },
      ],
    });

    if (request)
      return next({ message: "Request already sent", statusCode: 400 });

    await Request.create({
      sender: req.user,
      receiver: userId,
    });

    emitEvent(req, NEW_REQUEST, [userId]);
    return res.status(200).json({
      success: true,
      message: "Friend request sent",
    });
  } catch (error) {
    next(error);
  }
};

const acceptFriendRequest = async (req, res, next) => {
  try {
    const { requestId, accept } = req.body;

    const request = await Request.findById(requestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    if (!request)
      return next({ message: "Request not found", statusCode: 404 });

    if (request.receiver._id.toString() !== req.user.toString()) {
      return next({
        message: "You are not authorised to accept this request",
        statusCode: 401,
      });
    }
    if (!accept) {
      await request.deleteOne();
      return res.status(200).json({
        success: true,
        message: "Friend request deleted",
      });
    }
    const members = [request.sender._id, request.receiver];

    await Promise.all([
      Chat.create({
        members,
        name: `${request.sender.name}-${request.receiver.name}`,
      }),
      request.deleteOne(),
    ]);

    emitEvent(req, REFETCH_CHATS, members);
    return res.status(200).json({
      success: true,
      message: "Friend request accepted",
      senderId: request.sender._id,
    });
  } catch (error) {
    next(error);
  }
};

const getAllNotifications = async (req, res, next) => {
  try {
    const requests = await Request.find({ receiver: req.user }).populate(
      "sender",
      "name avatar"
    );

    const allRequestss = requests.map(({ _id, sender }) => ({
      _id,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    }));
    res.status(200).json({
      success: true,
      requests: allRequestss,
    });
  } catch (error) {
    next(error);
  }
};

const getMyFriends = async (req, res, next) => {
  try {
    const chatId = req.query.chatId;

    const chats = await Chat.find({
      members: req.user,
      groupChat: false,
    }).populate("members", "name avatar");

    const friends = chats.map(({ members }) => {
      const otherUser = getOtherMember(members, req.user);

      return {
        _id: otherUser._id,
        name: otherUser.name,
        avatar: otherUser.avatar.url,
      };
    });

    if (chatId) {
      const chat = await Chat.findById(chatId);

      const availableFriends = friends.filter(
        (friends) => !chat.members.includes(friends._id)
      );

      return res.status(200).json({
        success: true,
        friends: availableFriends,
      });
    } else {
      return res.status(200).json({
        success: true,
        friends,
      });
    }
  } catch (error) {
    next(error);
  }
};

export {
  login,
  signup,
  profile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
};
