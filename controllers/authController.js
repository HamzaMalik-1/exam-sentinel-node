const asyncHandler = require("../utils/AsyncHelper/Async");
const { BaseController } = require('./indexController');
const { User } = require('../models/index');
const { Op } = require("sequelize");
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");
// const { use } = require("react");
const transporter = require('../config/nodemailer');
const { InternalServerError, UnauthorizedError, NotFoundError, BadRequestError } = require("../utils/ErrorHelpers/Errors");

const UserController = new BaseController(User);

exports.signup = asyncHandler(async (req, res) => {
  // Check body exists
  UserController.bodyExist(req.body);

  // Validate required fields
  UserController.requireFields(req.body, ["username", "email", "password"]);

  const { username, email, password } = req.body;

  // Check for existing user
  const filter = {
    [Op.or]: [{ email }, { username }],
  };
  await UserController.alreadyExist(filter); // ✅ FIX: Add await

  // Create new user
  const user = await UserController.create({ username, email, password });

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "User registered successfully",
    data: user,
  });
});

exports.sendotp = asyncHandler(async (req, res) => {

  UserController.bodyExist(req.body);
  UserController.requireFields(req.body, ["email"]);

  const { email } = req.body;

  // Optional: Check if user exists (remove alreadyExist if you want to send OTP only to existing users)
  const user = await UserController.findOne({ email },"Email not found"); // ✅ fixed filter

  const otp = await user.sendOtp(); // Must be defined as instance method in User model

  const mailOptions = {
    from: `Your App Name`,
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is: ${otp}`,
    html: `<h3>Your OTP Code</h3><p><strong>${otp}</strong></p>`,
  };

  // await transporter.sendMail(mailOptions); // uncomment when ready
  return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "OTP sent to your email",
  });
});

exports.verifyotp = asyncHandler( async (req,res)=>{

      UserController.bodyExist(req.body);
       UserController.requireFields(req.body, ["email","otp"]);

  const { email,otp } = req.body;

  const user = await UserController.findOne({ email },"Email not found"); // ✅ fixed filter
const isVerified = await user.isVerifyOtp(otp);
  if(isVerified)
  {
    return res.status(StatusCodes.CREATED).json({
    success: true,
    message: "OTP is verify",
  });
  }
  else{
    throw new UnauthorizedError("Otp is not correct")
  }

} )

exports.login = asyncHandler(async (req, res) => {
  UserController.bodyExist(req.body);

  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new BadRequestError("Either email or username is required");
  }

  UserController.requireFields(req.body, ["password"]);

  const conditions = [];
  if (email) conditions.push({ email });
  if (username) conditions.push({ username });

  const filter = {
    [Op.or]: conditions,
  };

  const user = await UserController.findOne(filter, "Account not found");

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new NotFoundError("Invalid email/username or password");
  }

  sendResponse(res, StatusCodes.OK,  "Login Successfully",user.dataValues);
});
