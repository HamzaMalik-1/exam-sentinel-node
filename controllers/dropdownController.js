const asyncHandler = require('../utils/AsyncHelper/Async');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const sendResponse = require('../utils/ResponseHelpers/sendResponse'); // ✅ Import
const Class = require('../models/Class');

const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({}).select("name _id").sort({ name: 1 });

  const data = subjects.map((item) => ({
    label: item.name,
    value: item._id,
  }));

  // ✅ Custom Response
  return sendResponse(res, StatusCodes.OK, "Subjects fetched", data);
});



const getTeachers = asyncHandler(async (req, res) => {
  const teachers = await User.find({ role: "teacher" })
    .select("firstName lastName _id")
    .sort({ firstName: 1 });

  const data = teachers.map((t) => ({
    label: `${t.firstName} ${t.lastName}`,
    value: t._id,
  }));

  // ✅ Custom Response
  return sendResponse(res, StatusCodes.OK, "Teachers fetched", data);
});

const getClasses = asyncHandler(async (req, res) => {
    // 1. Get the current user ID from the auth middleware
    const userId = req.user?._id;
    console.log("Current User ID:", userId);

    if (!userId) {
        return sendResponse(res, StatusCodes.UNAUTHORIZED, "User not authenticated", null);
    }

    // 2. Filter using 'teacher' (instead of createdBy) and 'isDeleted' (instead of isActive)
    const classes = await Class.find({ 
        isDeleted: false,      // Match your document structure
        teacher: userId        // Match your document structure
    }).select('className _id');
    
    // 3. Map to standard dropdown format
    const formattedClasses = classes.map(cls => ({
        label: cls.className,
        value: cls._id
    }));

    console.log("Found Classes:", formattedClasses);

    return sendResponse(res, StatusCodes.OK, "Classes fetched successfully", formattedClasses);
});

module.exports = {
  getSubjects,
  getTeachers,
  getClasses
};