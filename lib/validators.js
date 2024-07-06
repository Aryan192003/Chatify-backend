import { body, param, validationResult, check } from "express-validator";

const registerValidator = () => [
  body("name", "Please Enter Name").notEmpty(),
  body("username", "Please Enter Username").notEmpty(),
  body("bio", "Please Enter Bio").notEmpty(),
  body("password", "Please Enter password").notEmpty(),
];

const loginValidator = () => [
  body("username", "Please Enter Username").notEmpty(),
  body("password", "Please Enter password").notEmpty(),
];

const newGroupChatValidator = () => [
  body("name", "Please Enter Names").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter members")
    .isArray({ min: 2, max: 100 })
    .withMessage("Members must be 2-100"),
];

const addMemberValidator = () => [
  body("chatId", "Please Enter chatId").notEmpty(),
  body("members")
    .notEmpty()
    .withMessage("Please Enter members")
    .isArray({ min: 1, max: 97 })
    .withMessage("Members must be 1-97"),
];

const removeMemberValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  body("userId", "Please Enter user Id").notEmpty(),
];

const leaveGroupValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
];

const getMessagesValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
];

const renameValidator = () => [
  param("id", "Please Enter Chat Id").notEmpty(),
  body("name", "Please Enter new name").notEmpty(),
];

const sendRequestValidator = () => [
  body("userId", "Please Enter UserId").notEmpty(),
];

const sendAttachmentValidator = () => [
  body("chatId", "Please Enter Chat Id").notEmpty(),
  
];

const acceptRequestValidator = () => [
  body("requestId", "Please Enter Request ID").notEmpty(),
  body("accept")
    .notEmpty()
    .withMessage("Please add accept")
    .isBoolean()
    .withMessage("Accept must be a boolean"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);

  const errorMessages = errors
    .array()
    .map((error) => error.msg)
    .join(",");
  if (errors.isEmpty()) return next();
  else next({ message: errorMessages, statusCode: 400 });
};

export {
  registerValidator,
  validate,
  loginValidator,
  newGroupChatValidator,
  addMemberValidator,
  removeMemberValidator,
  leaveGroupValidator,
  sendAttachmentValidator,
  getMessagesValidator,
  renameValidator,
  sendRequestValidator,
  acceptRequestValidator,
};
