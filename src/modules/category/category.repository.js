import Category from "./category.model.js";

export const createCategory = async (
  categoryData,
) => {
  return Category.create(categoryData);
};

export const findCategoryById = async (
  categoryId,
) => {
  return Category.findOne({
    _id: categoryId,
    isDeleted: false,
  }).lean();
};

export const findCategoryBySlug = async (
  slug,
) => {
  return Category.findOne({
    slug,
    isDeleted: false,
  }).lean();
};

export const findCategoryByName = async (
  name,
) => {
  return Category.findOne({
    name,
    isDeleted: false,
  }).lean();
};

export const findCategoryBySlugIncludingDeleted =
  async (slug) => {
    return Category.findOne({
      slug,
    }).lean();
  };

export const findCategoryByNameIncludingDeleted =
  async (name) => {
    return Category.findOne({
      name,
    }).lean();
  };

export const findCategories = async ({
  filter,
  skip,
  limit,
}) => {
  return Category.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

export const countCategories = async (
  filter,
) => {
  return Category.countDocuments(filter);
};

export const updateCategoryById = async (
  categoryId,
  updateData,
) => {
  return Category.findOneAndUpdate(
    {
      _id: categoryId,
      isDeleted: false,
    },
    {
      $set: updateData,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  ).lean();
};

export const softDeleteCategoryById =
  async (categoryId) => {
    return Category.findOneAndUpdate(
      {
        _id: categoryId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
        },
      },
      {
        returnDocument: "after",
      },
    ).lean();
  };