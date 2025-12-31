const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const asyncHandler = require('../utils/AsyncHelper/Async');
const BaseController = require('../bases/BaseController');
const { StatusCodes } = require('http-status-codes');
const { NotFoundError, BadRequestError } = require('../utils/ErrorHelpers/Errors');
const sendResponse = require('../utils/ResponseHelpers/sendResponse');

class ExamController extends BaseController {
  constructor() {
    super(Exam);
  }

  // @desc    Get All Exams (Search & Pagination)
  // @route   GET /api/exams
  getAllExams = asyncHandler(async (req, res) => {
    const { search, subject, page, limit, paginate } = req.query;

    let filter = {};

    // 1. Use 'title' instead of 'testName' to match your Schema
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    // 2. Use 'subjectId' instead of 'subject' to match your Schema
    if (subject && subject !== 'all') {
      filter.subjectId = subject;
    }

    const options = {
      page,
      limit,
      paginate: paginate === 'true',
      // ✅ FIX: Changed path to 'subjectId' to match the Schema field name
      populate: [{ path: 'subjectId', select: 'name' }], 
      sort: { createdAt: -1 }
    };

    const result = await this.getAllOrPaginated(filter, options);

    return sendResponse(res, StatusCodes.OK, "Exams fetched successfully", result);
  });

  // @desc    Create New Exam
  // @route   POST /api/exams
  createExam = asyncHandler(async (req, res) => {
    // Destructure what the frontend sends
    const { testName, subject, timeLimit, description, questions, createdBy } = req.body;

    // Validation
    if (!testName || !subject || !timeLimit) {
      throw new BadRequestError("Test Name, Subject, and Time Limit are required");
    }

    // Identify the author
    const creatorId = req.user?._id || createdBy; 
    if (!creatorId) {
      throw new BadRequestError("Author (createdBy) information is missing");
    }

    // ✅ Map to Mongoose Schema exactly
    const newExam = await Exam.create({
      title: testName,           
      subjectId: subject,        
      createdBy: creatorId,      
      timeLimit: Number(timeLimit),
      description: description || "",
      questions: questions || [],
      totalQuestions: questions?.length || 0
    });

    return sendResponse(res, StatusCodes.CREATED, "Exam created successfully", newExam);
  });

  // @desc    Generate Questions using AI
  generateAIQuestions = asyncHandler(async (req, res) => {
    const { subject, numQuestions, type, prompt } = req.body;
    if (!prompt) throw new BadRequestError("Prompt is required for AI generation");

    return sendResponse(res, StatusCodes.OK, "AI is processing your questions...", {
        estimatedTime: "30 seconds"
    });
  });

  // @desc    Delete Exam
  deleteExam = asyncHandler(async (req, res) => {
    const result = await Exam.findByIdAndDelete(req.params.id);
    if (!result) throw new NotFoundError("Exam not found");
    return sendResponse(res, StatusCodes.OK, "Exam deleted successfully", null);
  });
  // backend/controllers/examController.js

// @desc    Update Existing Exam
// @route   PUT /api/exams/:id
updateExam = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { testName, subject, timeLimit, description, questions } = req.body;

    // Optional: Add basic validation like in createExam
    if (!testName || !subject || !timeLimit) {
        throw new BadRequestError("Test Name, Subject, and Time Limit are required");
    }

    const updatedExam = await Exam.findByIdAndUpdate(
        id,
        {
            title: testName,           // Map frontend 'testName' to Schema 'title'
            subjectId: subject,        // Map frontend 'subject' to Schema 'subjectId'
            timeLimit: Number(timeLimit),
            description: description || "",
            questions: questions || [],
            totalQuestions: questions?.length || 0
        },
        { new: true, runValidators: true }
    );

    if (!updatedExam) {
        throw new NotFoundError("Exam not found");
    }

    return sendResponse(res, StatusCodes.OK, "Exam updated successfully", updatedExam);
});

getExamById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // We fetch the exam and populate subjectId to get the name if needed
    const exam = await Exam.findById(id).populate('subjectId', 'name');

    if (!exam) {
        throw new NotFoundError("Exam not found");
    }

    return sendResponse(res, StatusCodes.OK, "Exam fetched successfully", exam);
});
}

module.exports = new ExamController();