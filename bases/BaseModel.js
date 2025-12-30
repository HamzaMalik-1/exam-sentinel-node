const { Model } = require('sequelize');

class BaseModel extends Model {
  static async paginate(query, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;
    const { count, rows } = await this.findAndCountAll({
      where: query,
      limit,
      offset,
    });
    return {
      data: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    };
  }
}

module.exports = BaseModel;
