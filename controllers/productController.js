const asyncHandler = require("../utils/AsyncHelper/Async");
const { Product, Category } = require("../models/index");
const { BaseController } = require("./indexController");
const sendResponse = require("../utils/ResponseHelpers/sendResponse");
const { StatusCodes } = require("http-status-codes");

const ProductController =new  BaseController(Product);
const CategoryController = new BaseController(Category);

// Violation of Rest API Rule
exports.CreateOrUpdateProduct = asyncHandler(async (req, res) => {
  console.log("req.body",req.body)
  console.log("req.file",req.file)
  ProductController.bodyExist(req.body);

  // Validate required fields
  ProductController.requireFields(req.body, ["name", "price", "category"]);

  const { id, name, imageUrl, price, description, category } = req.body;

  // 🔍 Find or create category instance
  const categoryInstance = await CategoryController.findOrCreate(
    { name: category }, // filter
    { name: category }  // data
  );

  let status;
  let product;
  let message;

  if (id) {
    // 🛠️ Update product
    product = await ProductController.findOne({ id });

    product.name = name || product.name;
    product.imageUrl = imageUrl || req.file?.path || product.imageUrl;
    product.price = price || product.price;
    product.description = description || product.description;
    product.categoryId = categoryInstance.id || product.categoryId;

    await product.save();

    status = StatusCodes.OK;
    message = 'Product Updated Successfully';
  } else {
  ProductController.fileExist(req.file);

    // ✅ Check for duplicate name
    await ProductController.alreadyExist({ name });

    // 🆕 Create product
    product = await ProductController.create({
      name,
      imageUrl: req.file.path,
      price,
      description,
      categoryId: categoryInstance.id
    });

    status = StatusCodes.CREATED;
    message = 'Product Created Successfully';
  }

const productData = product.toJSON();
productData.categoryName = categoryInstance.name;

  sendResponse(res, status, message,productData);
});

// exports.CreateProduct = asyncHandler(async (req, res) => {
//   ProductController.bodyExist(req.body);
//   ProductController.requireFields(req.body, ["name", "price", "category"]);
//   ProductController.fileExist(req.file);

//   const { name, imageUrl, price, description, category } = req.body;

//   const categoryInstance = await CategoryController.findOrCreate(
//     { name: category },
//     { name: category }
//   );

//   await ProductController.alreadyExist({ name });

//   const product = await ProductController.create({
//     name,
//     imageUrl: req.file.path,
//     price,
//     description,
//     categoryId: categoryInstance.id
//   });

//   const productData = product.toJSON();
//   productData.categoryName = categoryInstance.name;

//   sendResponse(res, StatusCodes.CREATED, "Product Created Successfully", productData);
// });

// exports.UpdateProduct = asyncHandler(async (req, res) => {
//   const { name, imageUrl, price, description, category } = req.body;
//   const { id } = req.params;

//   ProductController.bodyExist(req.body);
//   if (!id) throw new BadRequest("Product ID is required");

//   const product = await ProductController.findOne({ id });

//   const categoryInstance = await CategoryController.findOrCreate(
//     { name: category },
//     { name: category }
//   );

//   product.name = name || product.name;
//   product.imageUrl = imageUrl || req.file?.path || product.imageUrl;
//   product.price = price || product.price;
//   product.description = description || product.description;
//   product.categoryId = categoryInstance.id || product.categoryId;

//   await product.save();

//   const productData = product.toJSON();
//   productData.categoryName = categoryInstance.name;

//   sendResponse(res, StatusCodes.OK, "Product Updated Successfully", productData);
// });




exports.DeleteProduct = asyncHandler(async (req, res) => {
  ProductController.paramsExist(req.params, ['id']); // Validate params

  const product = await ProductController.delete({ id: req.params.id });

  sendResponse(
    res,
    StatusCodes.OK,
    `Product ${product.name} is deleted successfully`,
    product,
  );
});

exports.GetProducts = asyncHandler(async (req, res) => {
  const { page, limit, paginate } = req.query;

  const result = await ProductController.getAllOrPaginated({}, {
    paginate: paginate === 'true',  // from query string
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  include: [{ model: Category, as: "category" }]

  });

  sendResponse(res, StatusCodes.OK, "Products fetched successfully",result.data);
});

exports.GetProductById =asyncHandler(async (req,res)=>{
    ProductController.paramsExist(req,params,['id'])
    const product = await ProductController.findOne(
        {id},
        "Product not found",
   [{ model: Category, as: "category" }]
    )

    sendResponse(res,StatusCodes.OK,`Product ${product.name} Found`,product)
})

