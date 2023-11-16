const Product = require('../models/productModal')
const Categories = require('../models/categoriesModal')
const { DefaultDeserializer } = require('v8')

const loadAddProduct = async (req,res)=>{
    try{
        const productData = await Categories.find()
        res.render('add-product',{categories:productData})
    }catch(error){
        console.log(error.message)
    }
}

const insertProduct  =  async (req,res)=>{
    try{
        const searchProduct = await Product.findOne({ name: new RegExp('^' + req.body.name + '$', 'i') })

        // const searchReturnData = await Product.find()
        const productData = await Categories.find()
        const categoriesId = await Categories.findOne({name:req.body.categories})
       console.log("categoriews Id :",categoriesId._id)
        if(searchProduct){
            console.log("Worked the sweet")
            res.render('add-product',{message: '1',categories:productData})

            // res.redirect('/admin/categories')
        }else{
            const newProduct = new Product({
                name:req.body.name,
                description:req.body.description,
                categoryId:categoriesId._id,
                regularPrice:req.body.regularPrice,
                salePrice:req.body.salePrice,
                stock:req.body.stock,
                image:[req.file.filename]


            })
            // console.log('inages  ;',req.body.image)
            console.log("kkk")
            console.log(req.file.filename)
            const productInsertedData = await newProduct.save()
            if(productInsertedData){
                res.render('add-product',{message: '2',categories:productData})
            }else{
                console.log("not inserted")
            }
        }
    }catch(error){
        console.log(error.message)
    }
}

// Loading Product pages

const loadProduct = async (req,res)=>{
  const productData = await Product.find() 
    try{
           res.render('products',{products:productData})
    }catch(error){
        console.log(error.message)
    }
}

const changeStatus = async (req,res)=>{
    try{
        const id =req.query.id;
        console.log(id)
        const active = req.query.active;
        console.log(active)
       
        if(active == 0){
            updateValue = 1

        }else{
            updateValue = 0
        }
        console.log(updateValue)

        const statusUpdation =  await Product.findByIdAndUpdate({_id:id},{$set:{is_active:updateValue}})

              console.log(statusUpdation)
        if(statusUpdation){
            // res.redirect('/userList')
             const message = "Product blocked Sucessfully"
        res.redirect(`/admin/products?message=${message}`)
        }

    }catch(error){
        console.log(error.message)
        res.status(500).send("Internal Server Error");
    }
}

const deleteProduct = async (req,res)=>{
    try{
        const id =req.query.id;
       

        const statusUpdation =  await Product.findByIdAndUpdate({_id:id},{$set:{is_deleted:1}})

              console.log(statusUpdation)
        if(statusUpdation){
            // res.redirect('/userList')
             const message = "Product deleted Sucessfully"
        res.redirect(`/admin/products?message=${message}`)
        }

    }catch(error){
        console.log(error.message)
        res.status(500).send("Internal Server Error");
    }
}

const loadEditProduct = async (req,res)=>{
    try{
        const productData = await Product.findById({_id:req.query.id})
        req.session.editProductId = req.query.id;
        const categoriesData = await Categories.find()
        // console.log(productData)
        res.render('editProduct',{product:productData,categories:categoriesData})
    }catch(error){
        console.log(error.message)
    }
}



const editProduct = async (req,res)=>{
    try{

        const productId = req.session.editProductId ;
        console.log(productId)
        // const productId = req.params.productId;


        // Access form data from req.body
        const { name, description, regularPrice, salePrice, stock, categories } = req.body;

        // Getting the category Id from Category 
        const categoriesId = await Categories.findOne({ name: categories });

        // Find the product by ID
        const product = await Product.findOne({_id:productId});

        // Update the product properties
        product.name = name;
        product.description = description;
        product.regularPrice = regularPrice;
        product.salePrice = salePrice;
        product.stock = stock;
        product.categoryId = categoriesId._id;

        console.log("SalePrice " ,salePrice)

        if (req.file) {
            // If a new image is uploaded, update the image property
            product.image = req.file.filename;
        }

        // Save the updated product to the database
        const updatedProduct = await product.save();
        const productDataAfterUpdation = await Product.find()

        console.log("Product updated successfully:", updatedProduct);
        // res.send('Product updated successfully');
        res.render('products',{products:productDataAfterUpdation,message:3})


    }catch(error){
        console.log(error.message)
        res.status(500).send("Internal server error")
    }
}


module.exports = {
    loadAddProduct,
    insertProduct,
    loadProduct,
    changeStatus,
    deleteProduct ,
    loadEditProduct,
    editProduct
}