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

    // 1. Fetch metadata snapshot
    const exam = await Exam.findById(examId);
    const enrollment = await Enrollment.findOne({ studentId, status: 'active' });

    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    let totalObtainedMarks = 0;
    const totalPossibleMarks = exam.questions.length;
    const studentResponses = [];
    const openEndQueue = [];

    // 2. Loop through questions to format answers and prepare AI queue
    exam.questions.forEach((q) => {
        const rawAns = answers[q._id.toString()];
        let formattedUserAnswer = "";
        let isCorrect = false;
        let marks = 0;

        // --- Formatting Logic by Type ---
        if (q.type === "radio") {
            // Radio: Single string answer
            formattedUserAnswer = typeof rawAns === "string" ? rawAns : "";
            isCorrect = formattedUserAnswer === q.correctAnswer;
            marks = isCorrect ? 1 : 0;
        } 
        else if (q.type === "checkbox") {
            // Checkbox: Comma separated string
            const studentAnsArray = Array.isArray(rawAns) ? rawAns : (rawAns ? [rawAns] : []);
            formattedUserAnswer = studentAnsArray.join(", ");

            // Safe sorting to prevent ".sort is not a function" error
            const studentSorted = [...studentAnsArray].sort();
            const correctAnsArray = Array.isArray(q.correctAnswer) 
                ? q.correctAnswer 
                : (q.correctAnswer ? [q.correctAnswer] : []);
            const correctSorted = [...correctAnsArray].sort();

            isCorrect = JSON.stringify(studentSorted) === JSON.stringify(correctSorted);
            marks = isCorrect ? 1 : 0;
        } 
        else if (q.type === "open end") {
            // Open End: Detailed text answer
            formattedUserAnswer = rawAns || "No answer provided";
            openEndQueue.push({
                questionId: q._id,
                questionText: q.question,
                studentAnswer: formattedUserAnswer
            });
        }

        totalObtainedMarks += marks;

        studentResponses.push({
            questionId: q._id,
            questionText: q.question,
            questionType: q.type,
            options: q.options || [],
            userAnswer: formattedUserAnswer,
            correctAnswer: q.correctAnswer, 
            isCorrect: isCorrect,
            obtainedMarks: marks,
        });
    });

    // 3. Process AI Evaluation for Descriptive Questions
    if (openEndQueue.length > 0) {
        try {
            const aiFeedback = await getAIGradeBatch(openEndQueue); 
            
            aiFeedback.forEach(feedback => {
                const respIndex = studentResponses.findIndex(r => r.questionId.toString() === feedback.questionId.toString());
                if (respIndex !== -1) {
                    studentResponses[respIndex].obtainedMarks = feedback.score;
                    studentResponses[respIndex].correctAnswer = feedback.suggestedSolution; // Detailed solution
                    studentResponses[respIndex].isCorrect = feedback.score >= 0.7; 
                    totalObtainedMarks += feedback.score;
                }
            });
        } catch (error) {
            console.error("AI Batch Grading Error:", error);
        }
    }

    const percentage = (totalObtainedMarks / totalPossibleMarks) * 100;

    // 4. Create Result Document
    const result = await Result.create({
        student: studentId,
        exam: examId,
        class: enrollment ? enrollment.classId : null,
        obtainedMarks: Number(totalObtainedMarks.toFixed(2)),
        totalMarks: totalPossibleMarks,
        percentage: Math.round(percentage),
        status: percentage >= 50 ? "Passed" : "Failed",
        responses: studentResponses
    });

    res.status(201).json({ success: true, data: result });
});
const getMyResults = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    // 1. Fetch results for the specific student
    // .populate() must match the field names defined in your Result Schema
    const results = await Result.find({ student: studentId })
        .populate("exam", "title")
        .populate("class", "className") // ✅ Populates the className from the Class model
        .sort({ submittedAt: -1 })
        .lean(); // Use lean() for faster read-only performance

    // 2. Format the results for the frontend table
    const formattedResults = results.map((record) => ({
        id: record._id,
        // ✅ record.class matches the schema field; .className matches the Class model field
        className: record.class?.className || "N/A", 
        testName: record.exam?.title || "Deleted Exam",
        
        // Safely check if submittedAt exists and format the date
        submissionDate: record.submittedAt 
            ? new Date(record.submittedAt).toISOString().split("T")[0] 
            : "N/A",
            
        obtainedMarks: record.obtainedMarks ?? 0, // Fallback to 0 if null
        totalMarks: record.totalMarks ?? 0,
        
        // Match the field name 'percentage' from your DB object and round it
        percentage: record.percentage !== undefined ? Math.round(record.percentage) : 0,
        
        status: record.status || "N/A" // Ensure status ("Passed"/"Failed") is included
    }));

    // 3. Return the response
    return res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Results fetched successfully", 
        data: formattedResults 
    });
});

// @desc    Get detailed breakdown of a specific result (Review View)
// @route   GET /api/student/results/:resultId
// @desc    Get detailed breakdown of a specific result (Review View)
// @route   GET /api/student/results/:resultId
const getResultDetails = asyncHandler(async (req, res) => {
    const { resultId } = req.params;

    // 1. Fetch result and only populate the top-level Exam/Class info
    // We don't need the detailed exam questions anymore because we have snapshots
    const result = await Result.findById(resultId)
        .populate("exam", "title subject") 
        .populate("class", "className")
        .lean();

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({ 
            success: false, 
            message: "Result not found" 
        });
    }

    // 2. Map responses directly from the saved snapshot in the Result document
    const formattedResponses = result.responses.map(resp => ({
        _id: resp._id,
        questionId: resp.questionId,
        questionText: resp.questionText,
        userAnswer: resp.userAnswer,
        correctAnswer: resp.correctAnswer, 
        isCorrect: resp.isCorrect,
        obtainedMarks: resp.obtainedMarks,
        // ✅ Use the snapshot fields we added to the Result Schema
        type: resp.questionType || "radio", 
        options: resp.options || []
    }));

    const formattedData = {
        obtainedMarks: result.obtainedMarks,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        status: result.status,
        className: result.class?.className || "N/A",
        exam: { 
            title: result.exam?.title || "Deleted Exam",
            subject: result.exam?.subject || "N/A"
        },
        responses: formattedResponses 
    };

    return res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Result details fetched successfully", 
        data: formattedData 
    });
});
module.exports = { getMyExams, registerInClass, getStudentProfile ,getExamInfo,getExamForTaking, submitExam,getMyResults,getResultDetails};