/**
 * Mongoose Plugin for Pagination
 * Replicates the behavior of your Sequelize BaseModel.paginate
 */
const paginatePlugin = (schema) => {
  
  // Add a static method 'paginate' to the schema
  schema.statics.paginate = async function (filter = {}, options = {}) {
    let { 
      page = 1, 
      limit = 10, 
      sort = { createdAt: -1 }, // Default: Newest first
      populate = []             // Option to populate relations
    } = options;

    // Ensure numbers
    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    // Run Count and Find in parallel for performance
    const [total, data] = await Promise.all([
      this.countDocuments(filter),
      this.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate(populate) // Support for populating refs (like 'teacher' or 'subjectId')
    ]);

    return {
      data,       // 'rows' in Sequelize
      total,      // 'count' in Sequelize
      page,
      totalPages: Math.ceil(total / limit),
    };
  };
};

module.exports = paginatePlugin;