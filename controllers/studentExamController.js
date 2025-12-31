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
    const openEndQuestionsToGrade = [];

    // 2. Grade Objective Questions & Collect Descriptive for AI
    exam.questions.forEach((q) => {
        const studentAns = answers[q._id];
        let isCorrect = false;
        let marks = 0;
        let correctAns = q.correctAnswer; // For MCQs, use the stored correct answer

        if (q.type === "radio" || q.type === "checkbox") {
            isCorrect = JSON.stringify(studentAns) === JSON.stringify(q.correctAnswer);
            marks = isCorrect ? 1 : 0;
            totalObtainedMarks += marks;

            studentResponses.push({
                questionId: q._id,
                questionText: q.question,
                userAnswer: studentAns,
                correctAnswer: correctAns,
                isCorrect: isCorrect,
                obtainedMarks: marks,
            });
        } else if (q.type === "open end") {
            // Collect descriptive questions for batch AI processing
            openEndQuestionsToGrade.push({
                id: q._id,
                question: q.question,
                answer: studentAns || "No answer provided"
            });
        }
    });

    // 3. Grade Descriptive Questions using AI Helper
    if (openEndQuestionsToGrade.length > 0) {
        const aiPrompt = `
            You are an exam grader. Grade the following descriptive answers.
            For each question, provide:
            1. A score (0 for incorrect, 0.5 for partial, 1 for fully correct).
            2. A brief 'suggestedCorrectAnswer' for student feedback.

            Return ONLY a valid JSON array in this exact format:
            [{"id": "questionId", "score": 1, "suggestedCorrectAnswer": "..."}]

            Questions and Answers:
            ${JSON.stringify(openEndQuestionsToGrade)}
        `;

        try {
            const aiResponse = await AIHelper.generateAIResponse(aiPrompt);
            
            // Clean markdown blocks if AI includes them
            const cleanedJson = aiResponse.replace(/```json|```/g, '').trim();
            const gradedResults = JSON.parse(cleanedJson);

            gradedResults.forEach(gradedQ => {
                const originalQ = openEndQuestionsToGrade.find(o => o.id.toString() === gradedQ.id.toString());
                totalObtainedMarks += gradedQ.score;

                studentResponses.push({
                    questionId: gradedQ.id,
                    questionText: originalQ.question,
                    userAnswer: originalQ.answer,
                    correctAnswer: gradedQ.suggestedCorrectAnswer, // Feedback from AI
                    isCorrect: gradedQ.score >= 0.7, // Consider correct if score is high
                    obtainedMarks: gradedQ.score,
                });
            });
        } catch (error) {
            console.error("AI Grading Error:", error.message);
            // Fallback: If AI fails, record 0 marks for descriptive questions
            openEndQuestionsToGrade.forEach(q => {
                studentResponses.push({
                    questionId: q.id,
                    questionText: q.question,
                    userAnswer: q.answer,
                    correctAnswer: "Pending AI Review",
                    isCorrect: false,
                    obtainedMarks: 0,
                });
            });
        }
    }

    const percentage = (totalObtainedMarks / totalPossibleMarks) * 100;

    // 4. Create Result Document
    const result = await Result.create({
        student: studentId,
        exam: examId,
        class: enrollment ? enrollment.classId : null,
        obtainedMarks: totalObtainedMarks,
        totalMarks: totalPossibleMarks,
        percentage: Math.round(percentage),
        status: percentage >= 50 ? "Passed" : "Failed",
        responses: studentResponses
    });

    res.status(StatusCodes.CREATED).json({ success: true, data: result });
});

const getMyResults = asyncHandler(async (req, res) => {
    const studentId = req.user._id;

    const results = await Result.find({ student: studentId })
        .populate("exam", "title")
        .populate("class", "className")
        .sort({ submittedAt: -1 });

    const formattedResults = results.map((record) => ({
        id: record._id,
        className: record.class?.className || "N/A",
        testName: record.exam?.title || "Deleted Exam",
        submissionDate: record.submittedAt.toISOString().split("T")[0],
        obtainedMarks: record.obtainedMarks,
        totalMarks: record.totalMarks,
        percentage: record.percentage,
    }));

    return sendResponse(res, StatusCodes.OK, "Results fetched", formattedResults);
});

// @desc    Get detailed breakdown of a specific result (Review View)
// @route   GET /api/student/results/:resultId
// @desc    Get detailed breakdown of a specific result (Review View)
// @route   GET /api/student/results/:resultId
const getResultDetails = asyncHandler(async (req, res) => {
    const { resultId } = req.params;

    // 1. Fetch result and populate the full Exam document to get question types/options
    const result = await Result.findById(resultId)
        .populate("exam") 
        .populate("class", "className")
        .lean();

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Result not found" });
    }

    // 2. Map responses and merge them with the Exam's question metadata (type, options, and correctness)
    const formattedResponses = result.responses.map(resp => {
        // Find the matching question in the original exam to get its structural metadata
        const originalQuestion = result.exam.questions.find(
            q => q._id.toString() === resp.questionId.toString()
        );

        return {
            _id: resp._id,
            questionId: resp.questionId,
            questionText: resp.questionText,
            userAnswer: resp.userAnswer,
            // ✅ Crucial: Send the correct answer (stored in Result during submit) to the frontend
            correctAnswer: resp.correctAnswer, 
            isCorrect: resp.isCorrect,
            obtainedMarks: resp.obtainedMarks,
            // Use metadata from exam document for UI rendering
            type: originalQuestion ? originalQuestion.type : "radio",
            options: originalQuestion ? originalQuestion.options : []
        };
    });

    const formattedData = {
        obtainedMarks: result.obtainedMarks,
        totalMarks: result.totalMarks,
        percentage: result.percentage,
        status: result.status,
        exam: { 
            title: result.exam?.title,
            subject: result.exam?.subject
        },
        responses: formattedResponses 
    };

    // Replace sendResponse with your standard JSON return if necessary
    return res.status(StatusCodes.OK).json({ 
        success: true, 
        message: "Result details fetched", 
        data: formattedData 
    });
});
module.exports = { getMyExams, registerInClass, getStudentProfile ,getExamInfo,getExamForTaking, submitExam,getMyResults,getResultDetails};