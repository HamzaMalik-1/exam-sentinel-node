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

    // 1. Find all active class enrollments for this student
    const enrollments = await Enrollment.find({ 
        studentId: studentId, 
        status: "active" 
    }).select('classId');

    if (!enrollments || enrollments.length === 0) {
        return sendResponse(res, StatusCodes.OK, "No enrollments found", []);
    }

    // 2. Extract Class IDs (Ensuring they are ObjectIds)
    const classIds = enrollments.map(enroll => enroll.classId);

    // 3. Fetch exams assigned to these classes
    // Added a check to ensure examId exists and is not null
    const assignments = await AssignedExam.find({ 
        classId: { $in: classIds },
        // If your AssignedExam schema doesn't have isDeleted, remove this line
        // isDeleted: false 
    })
    .populate({
        path: 'examId',
        select: 'title timeLimit', // Changed 'duration' to 'timeLimit' to match your data
    })
    .populate('classId', 'className')
    .sort({ startTime: 1 });

    // 4. Format data
    const formattedExams = await Promise.all(assignments.map(async (item) => {
        if (!item.examId) return null; // Skip if exam was deleted but assignment remains

        const completedRecord = await Result.findOne({ 
            examId: item.examId._id, 
            studentId: studentId 
        });

        return {
            id: item.examId._id, // Use the Exam ID for navigation
            assignmentId: item._id,
            className: item.classId?.className || "Unknown Class",
            testName: item.examId.title,
            timeLimit: item.examId.timeLimit || 0, // Matches your data field 'timeLimit'
            startDate: item.startTime,
            endDate: item.endTime,
            isAttempted: !!completedRecord,
            isExamContinue: true 
        };
    }));

    // Filter out any null entries from skipped orphaned assignments
    const finalData = formattedExams.filter(exam => exam !== null);

    return sendResponse(
        res, 
        StatusCodes.OK, 
        "Assigned exams fetched successfully", 
        finalData
    );
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