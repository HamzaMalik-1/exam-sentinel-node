const asyncHandler = require('../utils/AsyncHelper/Async');
const Subject = require('../models/Subject');
const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const sendResponse = require('../utils/ResponseHelpers/sendResponse'); // ✅ Import

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

module.exports = {
  getSubjects,
  getTeachers,
};