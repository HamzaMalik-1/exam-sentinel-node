const User = require("../models/User");
const AssignedExam = require("../models/AssignedExam");
const Result = require("../models/Result");
const Enrollment = require("../models/Enrollment"); // ✅ New import
const asyncHandler = require("../utils/AsyncHelper/Async");
const { BadRequestError, NotFoundError } = require("../utils/ErrorHelpers/Errors");
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");

// @desc    Get all exams assigned to the student's enrolled classes
const getMyExams = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    // 1. Find all active enrollments for this student
    const enrollments = await Enrollment.find({ 
        studentId, 
        status: "active" 
    }).select('classId');

    if (!enrollments || enrollments.length === 0) {
        throw new NotFoundError("Student is not enrolled in any class.");
    }

    // 2. Extract class IDs into an array
    const classIds = enrollments.map(enroll => enroll.classId);

    // 3. Fetch exams assigned to ANY of those class IDs
    const assignments = await AssignedExam.find({ 
        classId: { $in: classIds },
        isDeleted: false 
    })
    .populate({
        path: 'examId',
        select: 'title duration',
        populate: { path: 'subjectId', select: 'name' }
    })
    .populate('classId', 'className')
    .sort({ startTime: 1 });

    // 4. Check for existing results to determine completion
    const formattedExams = await Promise.all(assignments.map(async (item) => {
        const completedRecord = await Result.findOne({ 
            examId: item.examId?._id, 
            studentId: studentId 
        });

        return {
            id: item._id,
            className: item.classId?.className,
            testName: item.examId?.title,
            timeLimit: item.examId?.duration || 0,
            startDate: item.startTime,
            endDate: item.endTime,
            isAttempted: !!completedRecord,
            isExamContinue: true 
        };
    }));

    return sendResponse(res, StatusCodes.OK, "Student exams fetched successfully", formattedExams);
});

// @desc    Register student to a class via Intermediate Table
const registerInClass = asyncHandler(async (req, res) => {
    const { classId } = req.body;
    const studentId = req.user._id;

    if (!classId) {
        throw new BadRequestError("Class ID is required");
    }

    // ✅ Create or Update Enrollment in the intermediate table
    const enrollment = await Enrollment.findOneAndUpdate(
        { studentId, classId },
        { status: "active" },
        { upsert: true, new: true, runValidators: true }
    );

    return sendResponse(res, StatusCodes.OK, "Enrolled in class successfully", enrollment);
});

// @desc    Get Student Profile (Fetching enrollments)
const getStudentProfile = asyncHandler(async (req, res) => {
    const student = await User.findById(req.user._id);
    const enrollments = await Enrollment.find({ studentId: req.user._id }).populate('classId');
    
    return sendResponse(res, StatusCodes.OK, "Profile fetched", {
        student,
        enrollments
    });
});

module.exports = { getMyExams, registerInClass, getStudentProfile };