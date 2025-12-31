const Class = require('../models/Class');
const Subject = require('../models/Subject'); 
const User = require('../models/User'); 
const asyncHandler = require('../utils/AsyncHelper/Async');
const BaseController = require('../bases/BaseController');
const { StatusCodes } = require('http-status-codes');

// ✅ Import your custom Error & Response helpers
const { NotFoundError, BadRequestError } = require('../utils/ErrorHelpers/Errors');
const sendResponse = require('../utils/ResponseHelpers/sendResponse'); // Adjust path as needed

class ClassController extends BaseController {
  constructor() {
    super(Class);
  }

  // @desc    Create a new class
  // @route   POST /api/classes
  createClass = asyncHandler(async (req, res) => {
    const { className, section, subject, teacher } = req.body; 

    // 1. Validation
    if (!className || !section || !subject) {
      throw new BadRequestError("Class Name, Section, and Subject are required.");
    }

    // 2. Resolve Subject (ObjectId -> Number ID)
    const subjectDoc = await Subject.findById(subject);
    if (!subjectDoc) {
      throw new NotFoundError("Selected subject not found.");
    }
    const realSubjectId = subjectDoc.id; 

    // 3. Check for Duplicates (checks active records only due to plugin)
    const exists = await Class.findOne({ 
      className, 
      section, 
      subjectId: realSubjectId 
    });

    if (exists) {
      throw new BadRequestError(`Class '${className}' (${section}) for this subject already exists.`);
    }

    // 4. Create Class
    const newClass = await this.create({
      className,
      section,
      subjectId: realSubjectId,
      teacher: teacher || null 
    });

    // ✅ USE sendResponse
    return sendResponse(
      res, 
      StatusCodes.CREATED, 
      "Class created successfully", 
      newClass
    );
  });

  // @desc    Get all classes
  // @route   GET /api/classes
  // ... imports

  // @desc    Get all classes (Paginated & Filtered)
  // @route   GET /api/classes
 // @desc    Get all classes (Paginated & Filtered)
  // @route   GET /api/classes
  getAllClasses = asyncHandler(async (req, res) => {
    // 1. Extract Query Params
    const { search } = req.query;

    // 2. Build Filter Object
    let filter = {};
    if (search) {
      filter.$or = [
        { className: { $regex: search, $options: 'i' } },
        { section: { $regex: search, $options: 'i' } }
      ];
    }

    // 3. Pass options to BaseController
    const options = {
      ...req.query, 
      populate: [
        { path: 'teacher', select: 'firstName lastName email' }
      ],
      sort: { createdAt: -1 }
    };

    const result = await this.getAllOrPaginated(filter, options);

    // 4. Handle Result Data
    let classes = [];
    let paginationData = {};

    // Check if result is paginated (has 'total' and 'data' array) or just an array
    if (result.total !== undefined) {
        classes = result.data;
        paginationData = {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages
        };
    } else {
        classes = result.data || result; // Handle non-paginated return
    }

    // 5. Manual Populate for Subject ID
    const subjectIds = [...new Set(classes.map(c => c.subjectId))];
    const subjects = await Subject.find({ id: { $in: subjectIds } }).lean();

    const subjectMap = {};
    subjects.forEach(sub => { subjectMap[sub.id] = sub.name; });

    // ✅ FIX IS HERE: Convert to Plain Object before spreading
    const populatedClasses = classes.map(cls => {
      // If it's a Mongoose doc, convert it. If it's already a plain object, use as is.
      const plainClass = cls.toObject ? cls.toObject() : cls;

      return {
        ...plainClass, // Now safely spreads only data fields
        subjectName: subjectMap[plainClass.subjectId] || "Unknown Subject",
        teacherName: plainClass.teacher 
          ? `${plainClass.teacher.firstName} ${plainClass.teacher.lastName}` 
          : "No Teacher Assigned"
      };
    });

    // 6. Construct Final Response
    const finalResponse = result.total !== undefined 
      ? { data: populatedClasses, ...paginationData } 
      : populatedClasses;

    return sendResponse(res, StatusCodes.OK, "Classes fetched", finalResponse);
  });

  // @desc    Delete Class (Soft Delete)
  // @route   DELETE /api/classes/:id
  deleteClass = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Use BaseController delete (handles soft delete automatically)
    await this.delete({ _id: id });

    // ✅ USE sendResponse
    return sendResponse(
      res, 
      StatusCodes.OK, 
      "Class deleted successfully",
      null
    );
  });

  updateClass = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { className, section, subject, teacher } = req.body;

    // 1. Resolve Subject (ObjectId -> Number ID) if provided
    let subjectId = undefined;
    if (subject) {
      const subjectDoc = await Subject.findById(subject);
      if (!subjectDoc) throw new NotFoundError("Subject not found");
      subjectId = subjectDoc.id;
    }

    // 2. Prepare Payload
    const updateData = {
      className,
      section,
      teacher: teacher || null
    };
    if (subjectId) updateData.subjectId = subjectId;

    // 3. Update
    const updatedClass = await Class.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedClass) throw new NotFoundError("Class not found");

    return sendResponse(res, StatusCodes.OK, "Class updated successfully", updatedClass);
  });
}

module.exports = new ClassController();