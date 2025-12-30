const express = require('express')

const router = express.Router()

const upload = require('../config/multer')
const { CreateOrUpdateProduct,DeleteProduct,GetProducts,GetProductById } = require('../controllers/productController')

router.post('/products',upload.single('product'),CreateOrUpdateProduct)
router.delete('/products/:id',DeleteProduct)

// apply sorting
router.get('/products', GetProducts); 
router.get('/products/:id', GetProductById); 





module.exports = router