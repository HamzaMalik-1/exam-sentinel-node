const softDeletePlugin = (schema) => {
  // 1. Add fields
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  // 2. Filter logic: Exclude items where isDeleted is true
  // ✅ FIX: Removed 'next' parameter. Since this is async, we just run the logic.
  const excludeDeleted = async function () {
    if (this.getFilter().isDeleted === undefined) {
      // Use $ne: true to include documents that don't have the field yet
      this.where({ isDeleted: { $ne: true } });
    }
  };

  // 3. Apply hooks to FIND and COUNT queries
  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);

  // 4. Soft Delete Method
  schema.methods.softDelete = async function () {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  // 5. Restore Method
  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };
};

module.exports = softDeletePlugin;