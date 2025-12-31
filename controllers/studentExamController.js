const User = require("../models/User");
const AssignedExam = require("../models/AssignedExam");
const Result = require("../models/Result");
const Enrollment = require("../models/Enrollment"); // ✅ New import
const asyncHandler = require("../utils/AsyncHelper/Async");
const { BadRequestError, NotFoundError } = require("../utils/ErrorHelpers/Errors");
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");
const Exam = require("../models/Exam");
const mongoose = require("mongoose"); // Required for ObjectId conversion
// @desc    Get all exams assigned to the student's enrolled classes
const getMyExams = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    // 1. Find the student's active enrollment
    const enrollments = await Enrollment.find({ 
        studentId: studentId, 
        status: "active" 
    }).select('classId');

    if (!enrollments || enrollments.length === 0) {
        return sendResponse(res, StatusCodes.OK, "No active enrollments found", []);
    }

    // 2. Convert string IDs to ObjectIds to ensure the $in query works correctly
    const classIds = enrollments.map(e => new mongoose.Types.ObjectId(e.classId));

    // 3. Fetch exams assigned to those classes
    const assignments = await AssignedExam.find({ 
        classId: { $in: classIds },
        // Ensure you aren't filtering out active exams accidentally
        // isDeleted: false // Only keep this if your schema actually has this field
    })
    .populate({
        path: 'examId',
        select: 'title timeLimit',
    })
    .populate('classId', 'className');

    // 4. Format and check Result status
    const formattedExams = await Promise.all(assignments.map(async (item) => {
        // Skip formatting if the exam document no longer exists (orphaned assignment)
        if (!item.examId) return null;

        const completedRecord = await Result.findOne({ 
            exam: item.examId._id, 
            student: studentId 
        });

        return {
            id: item.examId._id,
            assignmentId: item._id,
            className: item.classId?.className || "N/A",
            testName: item.examId?.title || "Untitled Test",
            timeLimit: item.examId?.timeLimit || 0,
            startDate: item.startTime,
            endDate: item.endTime,
            isAttempted: !!completedRecord, 
            isExamContinue: true 
        };
    }));

    // 5. Filter out null values from the array
    const finalData = formattedExams.filter(exam => exam !== null);

    return sendResponse(res, StatusCodes.OK, "Exams fetched successfully", finalData);
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
const getExamInfo = asyncHandler(async (req, res) => {
    const exam = await Exam.findById(req.params.examId)
        .populate('subjectId', 'name')
        .select('title description timeLimit questions');

    if (!exam) {
        return res.status(404).json({ success: false, message: "Exam not found" });
    }

    // ✅ Get student name from the authenticated user (req.user)
    const fullName = `${req.user.firstName} ${req.user.lastName}`;

    res.status(200).json({
        success: true,
        data: {
            title: exam.title,
            subject: exam.subjectId?.name || "General",
            timeLimit: exam.timeLimit, // ✅ Test Time
            totalQuestions: exam.questions?.length || 0,
            guidelines: exam.description, // ✅ Dynamic Guidelines
            studentName: fullName // ✅ Student Name
        }
    });
});


// @desc    Get Specific Exam for Taking Test
// @route   GET /api/student/take-exam/:id
const getExamForTaking = asyncHandler(async (req, res) => {
    // 1. Fetch the exam from the database
    const exam = await Exam.findById(req.params.id)
        .select('title timeLimit questions description')
        .lean();

    if (!exam) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
            success: false, 
            message: "Exam not found" 
        });
    }

    // 2. Format the data for the frontend
    const formattedData = {
        id: exam._id,
        title: exam.title,
        duration: exam.timeLimit,
        studentName: `${req.user.firstName} ${req.user.lastName}`,
        questions: exam.questions.map(q => ({
            id: q._id,
            type: q.type,
            // ✅ FIX: Use q.question because that is the key in your database
            question: q.question, 
            options: q.options || []
        }))
    };

    return sendResponse(res, StatusCodes.OK, "Exam fetched successfully", formattedData);
});
// @desc    Submit Exam and Grade via AI
// @route   POST /api/student/submit-exam
const submitExam = asyncHandler(async (req, res) => {
    const { examId, answers } = req.body;
    const studentId = req.user._id;

    // 1. Fetch Exam and Enrollment to get the Class ID
    const exam = await Exam.findById(examId);
    const enrollment = await Enrollment.findOne({ studentId, status: 'active' });

    if (!exam) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Exam not found" });

    let totalObtainedMarks = 0;
    const totalPossibleMarks = exam.questions.length;
    const studentResponses = [];

    // 2. Grade Objective Questions
    exam.questions.forEach((q) => {
        const studentAns = answers[q._id];
        let isCorrect = false;
        let marks = 0;

        if (q.type === "radio" || q.type === "checkbox") {
            isCorrect = JSON.stringify(studentAns) === JSON.stringify(q.correctAnswer);
            marks = isCorrect ? 1 : 0; // Assuming 1 mark per question
        } 
        // Open-end questions default to 0 marks for now
        
        totalObtainedMarks += marks;

        studentResponses.push({
            questionId: q._id,
            questionText: q.question,
            userAnswer: studentAns,
            isCorrect: isCorrect,
            obtainedMarks: marks,
        });
    });

    const percentage = (totalObtainedMarks / totalPossibleMarks) * 100;

    // 3. Create Result Document using your schema
    const result = await Result.create({
        student: studentId,
        exam: examId,
        class: enrollment ? enrollment.classId : null,
        obtainedMarks: totalObtainedMarks,
        totalMarks: totalPossibleMarks,
        percentage: percentage,
        status: percentage >= 50 ? "Passed" : "Failed",
        responses: studentResponses
    });

    res.status(StatusCodes.CREATED).json({ success: true, data: result });
});

module.exports = { getMyExams, registerInClass, getStudentProfile ,getExamInfo,getExamForTaking, submitExam};