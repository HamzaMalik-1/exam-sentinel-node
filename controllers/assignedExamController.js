const AssignedExam = require('../models/AssignedExam');
const asyncHandler = require('../utils/AsyncHelper/Async');
const BaseController = require('../bases/BaseController');
const { StatusCodes } = require('http-status-codes');
const sendResponse = require('../utils/ResponseHelpers/sendResponse');
const { BadRequestError, NotFoundError } = require('../utils/ErrorHelpers/Errors');

class AssignedExamController extends BaseController {
  constructor() {
    super(AssignedExam);
  }

  // @desc    Get All Assignments (For the table view)
 // @desc    Get All Assignments (For the table view)
// controllers/assignedExamController.js

getAllAssignments = asyncHandler(async (req, res) => {
    const { search, page, limit, classId } = req.query;
    
    // 1. Initial filter: Only show assignments created by this teacher
    let filter = { createdBy: req.user._id }; 

    // 2. Apply Class Filter
    if (classId && classId !== "undefined" && classId !== "") {
        filter.classId = classId;
    }

    // 3. Apply Search Logic (Fixed)
    if (search && search.trim() !== "") {
        // We need to find Exam IDs where the title matches the search string
        const Exam = require('../models/Exam'); // Ensure Exam model is imported
        
        const matchingExams = await Exam.find({
            title: { $regex: search, $options: 'i' } // Case-insensitive regex search
        }).select('_id');

        const examIds = matchingExams.map(exam => exam._id);

        // Add to filter: only show assignments where examId is in our matched list
        filter.examId = { $in: examIds };
    }

    const options = {
        paginate: true,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        populate: [
            { path: 'classId', select: 'className' },
            { 
                path: 'examId', 
                select: 'title subjectId',
                populate: { path: 'subjectId', select: 'name' } 
            }
        ],
        sort: { createdAt: -1 }
    };

    const result = await this.getAllOrPaginated(filter, options);
    return sendResponse(res, StatusCodes.OK, "Assignments fetched", result);
});

  delete = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // 1. Check if ID exists
    this.paramsExist(req.params, ['id']);

    // 2. Call the BaseController's delete logic with a clean filter
    // This triggers your soft-delete check internally without circular errors
    const result = await super.delete({ _id: id });

    // 3. Send the formatted response
    return sendResponse(res, StatusCodes.OK, "Exam assignment deleted successfully", result);
  });

  // ... (assignExam remains the same)

  // @desc    Update Assignment
  updateAssignment = asyncHandler(async (req, res) => {
    const { startTime, endTime } = req.body;

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestError("End time must be after start time");
    }

    // ✅ Change: Added deep population so UI "Subject" column doesn't break after update
    const updated = await AssignedExam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
        { path: 'classId', select: 'className' },
        { 
          path: 'examId', 
          select: 'title subjectId',
          populate: { path: 'subjectId', select: 'name' } 
        }
    ]);

    if (!updated) throw new NotFoundError("Assignment not found");

    return sendResponse(res, StatusCodes.OK, "Schedule updated", updated);
  });

  // @desc    Assign New Exam
  assignExam = asyncHandler(async (req, res) => {
    const { classId, examId, startTime, endTime } = req.body;

    if (!classId || !examId || !startTime || !endTime) {
      throw new BadRequestError("All fields are required");
    }

    if (new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestError("End time must be after start time");
    }

    const assignment = await AssignedExam.create({
      classId,
      examId,
      startTime,
      endTime,
      createdBy: req.user._id // Taken from protect middleware
    });

    return sendResponse(res, StatusCodes.CREATED, "Exam assigned successfully", assignment);
  });

  // @desc    Update Assignment
  updateAssignment = asyncHandler(async (req, res) => {
    const { startTime, endTime } = req.body;

    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      throw new BadRequestError("End time must be after start time");
    }

    const updated = await AssignedExam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
        { path: 'classId', select: 'className' },
        { path: 'examId', select: 'title' }
    ]);

    if (!updated) throw new NotFoundError("Assignment not found");

    return sendResponse(res, StatusCodes.OK, "Schedule updated", updated);
  });
}

module.exports = new AssignedExamController();