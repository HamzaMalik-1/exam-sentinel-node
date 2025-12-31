const User = require('../models/User');
const asyncHandler = require('../utils/AsyncHelper/Async');
const BaseController = require('../bases/BaseController');
const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../utils/ErrorHelpers/Errors');
const sendResponse = require('../utils/ResponseHelpers/sendResponse');

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  // @desc    Get All Users (Supports Pagination, Search, and Role Filter)
  // @route   GET /api/users
  getAllUsers = asyncHandler(async (req, res) => {
    const { search, role, page, limit, paginate } = req.query;

    // 1. Build Filter
    let filter = {};

    // Filter by Role (e.g., ?role=teacher)
    if (role) {
      filter.role = role;
    }

    // Filter by Search Term (First Name, Last Name, or Email)
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // 2. Prepare Options
    const options = {
      page,
      limit,
      paginate: paginate === 'true', // Ensure boolean
      sort: { createdAt: -1 }, // Newest first
      select: '-password' // ⚠️ NEVER send passwords back
    };

    // 3. Fetch Data (Using BaseController logic)
    const result = await this.getAllOrPaginated(filter, options);

    return sendResponse(res, StatusCodes.OK, "Users fetched successfully", result);
  });

  // @desc    Create a new User (Teacher/Student)
  // @route   POST /api/users
  createUser = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, role } = req.body;

    // 1. Check for missing fields
    if (!firstName || !lastName || !email || !password || !role) {
      throw new BadRequestError("All fields are required");
    }

    // 2. Check if email already exists
    // (We manually check to throw a friendly error before Mongoose does)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError("Email is already registered");
    }

    // 3. Create User
    // Note: Password hashing happens in the User Model's pre-save hook
    const newUser = await this.create({
      firstName,
      lastName,
      email,
      password,
      role
    });

    // Remove password from response
    newUser.password = undefined;

    return sendResponse(res, StatusCodes.CREATED, "User created successfully", newUser);
  });

  // @desc    Update User Details
  // @route   PUT /api/users/:id
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;

    // 1. Find and Update
    // We strictly select what fields can be updated here.
    // We DO NOT update password here (that should be a separate route).
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    return sendResponse(res, StatusCodes.OK, "User updated successfully", updatedUser);
  });

  // @desc    Delete User (Soft Delete)
  // @route   DELETE /api/users/:id
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Use BaseController delete (handles soft delete automatically via plugin)
    await this.delete({ _id: id });

    return sendResponse(res, StatusCodes.OK, "User deleted successfully", null);
  });
}

module.exports = new UserController();