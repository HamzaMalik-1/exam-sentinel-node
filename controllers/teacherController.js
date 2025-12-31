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


const getDetailedClassResults = asyncHandler(async (req, res) => {
    const { resultId } = req.params; // This matches the 'examId' passed from the overview

    // 1. Fetch all results for this specific exam
    const results = await Result.find({ exam: resultId })
        .populate("student", "firstName lastName rollNo") // Fetch student profile info
        .populate("exam", "title totalMarks")
        .populate("class", "className");

    if (!results || results.length === 0) {
        return sendResponse(res, StatusCodes.OK, "No results found for this exam", {
            meta: {},
            students: []
        });
    }

    // 2. Format Metadata for the Header
    const examMeta = {
        className: results[0].class?.className || "N/A",
        testName: results[0].exam?.title || "Untitled Test",
        date: results[0].submittedAt ? results[0].submittedAt.toISOString().split('T')[0] : "N/A",
        totalMarks: results[0].totalMarks || 100
    };

    // 3. Format Student List
    const studentData = results.map(r => ({
        id: r._id,
        rollNo: r.student?.rollNo || "N/A",
        name: `${r.student?.firstName} ${r.student?.lastName}`,
        obtained: r.obtainedMarks,
        percentage: r.percentage,
        status: r.status // "Passed" or "Failed"
    }));

    return sendResponse(res, StatusCodes.OK, "Detailed results fetched", {
        meta: examMeta,
        students: studentData
    });
});
module.exports = { getClassExamResults,getDetailedClassResults };