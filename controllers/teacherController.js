const Result = require("../models/Result");
const asyncHandler = require("../utils/AsyncHelper/Async");
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");

// @desc    Get aggregated results for all classes (Teacher Overview)
// @route   GET /api/teacher/exam-results
const getClassExamResults = asyncHandler(async (req, res) => {
    const aggregatedResults = await Result.aggregate([
        {
            $group: {
                // Group by both the exam and the specific class
                _id: { exam: "$exam", class: "$class" },
                averagePercentage: { $avg: "$percentage" },
                totalStudents: { $sum: 1 },
                latestSubmission: { $max: "$submittedAt" }
            }
        },
        {
            $lookup: {
                from: "exams",
                localField: "_id.exam",
                foreignField: "_id",
                as: "examDetails"
            }
        },
        {
            $lookup: {
                from: "classes",
                localField: "_id.class",
                foreignField: "_id",
                as: "classDetails"
            }
        },
        { $unwind: "$examDetails" },
        { $unwind: "$classDetails" },
        {
            $project: {
                _id: 0,
                resultId: "$_id.exam", 
                className: "$classDetails.className",
                testName: "$examDetails.title",
                date: { $dateToString: { format: "%Y-%m-%d", date: "$latestSubmission" } },
                totalStudents: 1,
                averagePercentage: { $round: ["$averagePercentage", 0] }
            }
        },
        { $sort: { date: -1 } }
    ]);

    return sendResponse(res, StatusCodes.OK, "Class performance results fetched", aggregatedResults);
});

module.exports = { getClassExamResults };