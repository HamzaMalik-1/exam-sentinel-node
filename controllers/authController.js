const asyncHandler = require("../utils/AsyncHelper/Async");
const BaseController = require('../bases/BaseController'); // Ensure path is correct
const User = require('../models/User'); // Direct Import
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");
// const transporter = require('../config/nodemailer'); // Uncomment if using email
const { BadRequestError, NotFoundError, UnauthorizedError } = require("../utils/ErrorHelpers/Errors");

// Initialize BaseController with Mongoose Model
const UserController = new BaseController(User);

// Helper to generate token (if not defined in Model)
const generateToken = (user) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// --- SIGNUP ---
exports.signup = asyncHandler(async (req, res) => {
  // 1. Validation
  UserController.bodyExist(req.body);
  UserController.requireFields(req.body, ["firstName", "lastName", "email", "password"]); // Adjusted fields based on your User model

  const { firstName, lastName, username, email, password, role } = req.body;

  // 2. Check if User Exists (Using Mongoose $or operator)
  // We check email OR username (if username is provided)
  const conditions = [{ email }];
  if (username) conditions.push({ username });

  const filter = { $or: conditions };
  
  await UserController.alreadyExist(filter, "User with this email or username already exists");

  // 3. Create User
  // Note: Password hashing should happen in the User Model (pre-save hook) 
  // or manually here if you prefer. assuming User model handles it or passed plain.
  const user = await UserController.create({ 
      firstName, 
      lastName, 
      username, 
      email, 
      password, // Ensure your User model hashes this!
      role 
  });

  // 4. Generate Token
  const token = generateToken(user);

  // 5. Send Response
  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "User registered successfully",
    data: {
      _id: user._id,
      email: user.email,
      role: user.role,
      token,
    },
  });
});

// --- LOGIN ---
exports.login = asyncHandler(async (req, res) => {
  UserController.bodyExist(req.body);

  const { email, username, password } = req.body;

  // 1. Validate Input
  if (!email && !username) {
    throw new BadRequestError("Either email or username is required");
  }
  UserController.requireFields(req.body, ["password"]);

  // 2. Build Query (Mongoose $or)
  const conditions = [];
  if (email) conditions.push({ email });
  if (username) conditions.push({ username });

  const filter = { $or: conditions };

  // 3. Find User
  // We explicitly select password because it might be 'select: false' in schema
  const user = await User.findOne(filter).select('+password'); 

  if (!user) {
    throw new NotFoundError("Invalid email/username or password");
  }

  // 4. Check Password
  // Assumes you have a 'comparePassword' method on your UserSchema
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw new NotFoundError("Invalid email/username or password");
  }

  // 5. Generate Token
  const token = generateToken(user);

  // 6. Send Response
  const userData = user.toObject();
  delete userData.password; // Remove password from response

  sendResponse(res, StatusCodes.OK, "Login Successfully", { ...userData, token });
});