// const { default: orders } = require("razorpay/dist/types/orders");
const Order = require("../models/orderModel");
const Product = require("../models/productModal");
const Categories = require("../models/categoriesModal");
const User = require("../models/userModal")
const Message = require("../models/messagesModel")
const {getSalesReportCounts} = require("../functions/admin")

const bcrypt = require('bcrypt')

require("dotenv").config();


    const loadLogin = async(req,res)=>{
        try{
            res.render('login')
        }catch(error){
            console.log(error.message)
        }
    }
    
const logout = async (req,res)=>{
    try{
        req.session.destroy(err => {
            if (err) {
              console.error('Error destroying session:', err);
              res.status(500).send('Internal Server Error');
            } else {
            
              res.redirect('/login');
            }
          })
    }catch(error){
        res.render('../pages/errorAdmin',{error:error.message})
        console.log(error.message)
    }
}
  const verifyLogin = async(req,res)=>{

        try{
            
            const email =req.body.email;
            const password = req.body.password;
    
          const adminData = await User.findOne({email:email})
    
           if(adminData){
           const passMatch = await bcrypt.compare(password,adminData.password)
            if(passMatch){
    
                if(adminData.isAdmin === 0){
                    res.render('login',{message:" password is incorrect"})
    
                }else{
                    req.session.admin = adminData;
                    res.redirect("/admin/home")
                }
    
            }else{
            res.render('login',{message:" password is incorrect"})
        }
           }else{
            res.render('login',{message:" password is incorrect"})
        }
    
        }catch(error){
            res.render('../pages/errorAdmin',{error:error.message})
            console.log(error.message)
        }
    }

const loadHome = async(req,res)=>{
    try {
        const userCount = await User.countDocuments({isActive:true,isAdmin:false})
        const productCount = await Product.countDocuments({isActive:true,isDeleted:false})
        const categoriesCount = await Categories.countDocuments({isActive:true,isDeleted:false})
        const orderCount = await Order.countDocuments()
        const orderData = await Order.find()
   

        const monthlyOrders = await Order.aggregate([
            {
                $project: {
                    month: { $month: '$orderDate' },
                },
            },
            {
                $group: {
                    _id: '$month',
                    totalOrders: { $sum: 1 }, 
                },
            },
        ]);

        const totalSum = orderData.reduce((sum,obj) => {
            return sum+=obj.totalAmount
            },0)
        
      
        res.render('index',{userCount,productCount,orderCount,categoriesCount,monthlyOrders:monthlyOrders,totalAmount:totalSum})
    } catch (error) {
        res.render('../pages/errorAdmin',{error:error.message})
        console.log(error.message)
        
    }
}

const loadUserList = async(req,res)=>{
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 2;
        const skip = (page - 1) * limit;

        var search = '';
        if(req.query.search){
            search = req.query.search;
        }

        const userData = await User.find({isAdmin:false,
        
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                {email:{$regex:'.*'+search+'.*',$options:'i'}}
            ]

        })
        .sort({createdTime:-1})
        .skip(skip)
        .limit(limit);
        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);
        res.render('user-list',{users:userData,currentPage: page,totalPages: totalPages})
    }catch(error){
        res.render('../pages/errorAdmin',{error:error.message})
        console.log(error.message)
    }
}

const changeStatus = async (req,res)=>{
    try{
        const id =req.query.id;
        const admin = req.query.admin;
        const userSessionId = process.env.SESSION_SECRET_KEY
        const updateValue = admin === "true" ? false : true;

        const statusUpdation =  await User.findByIdAndUpdate({_id:id},{$set:{isActive:updateValue}})


        if (statusUpdation) {
            const message = `User ${updateValue ? 'activated' : 'blocked'} successfully.`;
            console.log(message);
    
            // Destroy the user session if blocking the user
            if (!updateValue) {
                if (req.session.user_id) {
                    delete req.session.user_id
                    req.session.save()
                
                    res.redirect('/admin/userList');
            
            } else{
                res.redirect('/admin/userList');
            }
         } else {
                res.redirect('/admin/userList');
            }
        } else {
            console.error('User not found or update failed.');
            res.status(404).send('User not found or update failed.');
        }

    }catch(error){
        console.log(error.message)
        res.status(500).send("Internal Server Error");
    }
}

// Load orders Page

const loadOrders = async (req,res) =>{
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        var search = '';
        if(req.query.status){
            search = req.query.status;
        }


        const orderData = await Order.find({ 
            $or:[
            {orderStatus:{$regex:'.*'+search+'.*',$options:'i'}}
        ]})
        .sort({orderDate:-1})
        .skip(skip)
        .limit(limit);
        const totalUsers = await Order.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);
        res.render('orders',{order:orderData,currentPage: page,totalPages: totalPages,search:search})
    } catch (error) {
        res.render('../pages/errorAdmin',{error:error.message})
        console.log(error.message)
    }
}

// chnage order status

const changeOrderStatus = async (req,res) =>{
    try{
        console.log("Order change status recieved")
        const {id,index,status,paymentStatus} = req.body
       let updatePaymentStatus = status == "Delivered" ? "Success" :  paymentStatus
        const updatedStatus = await Order.findByIdAndUpdate(id,{orderStatus:status,paymentStatus:updatePaymentStatus,'items.$[element].productStatus': status},{
            new: true,
            arrayFilters: [{ 'element.productId': { $exists: true } }],
          })
        
        if(updatedStatus){
        res.status(200).json({ success: true, changedOrderStatus:updatedStatus.orderStatus,successMessage: 'Status Changed Successfully'});
        }
    }catch(error){
        console.log(error.message)
        res.status(500).json({ success: false, warningMessage: 'Some unwanted error occur at server .' });

    }
}

const loadOrderDetails = async (req,res)=>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId)
        .populate('userId') 
        .populate('items.productId') 
        .exec();
    
        res.render('orderDetails' ,{order:orderData})
    } catch (error) {
        res.render('../pages/errorAdmin',{error:error.message})
        console.log(error.message)
    }
}

const loadSalesReport = async (req,res)=>{
    try {
       
        var startDate = null;
        var endDate =null ;
        const salesReportDuration = req.query.salesReportDuration;
        const userCount = await User.countDocuments({isActive:true,isAdmin:false})
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let search = req.query.search || '';
        let fromDate = req.query.toDate ||'';
        let toDate= req.query.toDate || '';
        if( req.query.fromDate && req.query.toDate){
            startDate = new Date(req.query.fromDate);
            endDate = new Date(req.query.toDate);
            endDate.setHours(23, 59, 59, 999);
         const dateData = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { orderDate: { $gte: startDate, $lte: endDate } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    "items.productStatus": "Delivered"  
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $sort:{
                    orderDate:-1
                }
            }
        ]);
        // const totalCount = dateData.length; // Assuming `orders` is the array of orders
        const uniqueIds = new Set(dateData.map(doc => doc._id.toString()))
        const totalCount = uniqueIds.size;
        const totalPages = Math.ceil(totalCount / limit);


        const paginatedOrders = dateData.slice(skip, skip + limit);
        const orderCounts =  getSalesReportCounts(dateData)

        res.render("salesReport", {
            orders: paginatedOrders,
            users: userCount,
            totalOrders: totalCount,
            onlinePayments: orderCounts.filterPaymentOnline,
            offlinePayments: orderCounts.filterPaymentOffline,
            walletPayments: orderCounts.filterPaymentWallet,
            totalAmount: orderCounts.totalSum,
            currentPage: page,
            totalPages: totalPages,
            search:search,
            fromDate:fromDate,
            toDate:toDate
            
        });
    

        return

        }

        const orderData1 = await Order.aggregate([
            {
                $match: {
                    $or: [
                        { orderId: { $regex: '.*' + search + '.*', $options: 'i' } },
                        { paymentStatus: { $regex: '.*' + search + '.*', $options: 'i' } },
                        { paymentMethod: { $regex: '.*' + search + '.*', $options: 'i' } },
                        { totalAmount: { $eq: parseFloat(search) } }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    "items.productStatus": "Delivered"  
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $sort:{
                    orderDate:-1
                }
            }
            
                 
        ]);

        const day = salesReportDuration === "Weekly" ? 7 : salesReportDuration === "Monthly" ? 30  : salesReportDuration === "Yearly" ? 365 : 0;
        const currentDate = new Date();
        const lastDate = new Date();
        lastDate.setDate(lastDate.getDate() - day);
      

        const orderData = await Order.aggregate([
            {
              $match: {
                orderDate: {
                  $gte: lastDate,
                  $lte: currentDate
                }
              }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails'
                }
            },
            {
                $unwind: '$userDetails'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $unwind: '$items'
            },
            {
                $match: {
                    "items.productStatus": "Delivered"  
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            {
                $sort:{
                    orderDate:-1
                }
            }
            
          ]);
        if( req.query.salesReportDuration){
            orders= orderData
            orderCounts = getSalesReportCounts(orderData)
        }else{
            orders=orderData1
            orderCounts = getSalesReportCounts(orderData1)

        }
        const uniqueIds = new Set(orders.map(doc => doc._id.toString()))
        const totalCount = uniqueIds.size;
        // const totalCount = orders.length; // Assuming `orders` is the array of orders

        const totalPages = Math.ceil(totalCount / limit);
    
        const paginatedOrders = orders.slice(skip, skip + limit);
     

        
    
        res.render("salesReport", {
            orders: paginatedOrders,
            users: userCount,
            totalOrders: totalCount,
            onlinePayments: orderCounts.filterPaymentOnline,
            offlinePayments: orderCounts.filterPaymentOffline,
            walletPayments: orderCounts.filterPaymentWallet,
            totalAmount: orderCounts.totalSum,
            currentPage: page,
            totalPages: totalPages,
            search:search,
            fromDate:fromDate,
            toDate:toDate
        });

       
    } catch (error) {
        console.log(error.message)
        res.render('../pages/errorAdmin',{error:error.message})
        
    }

   
}
const loadChart = async (req,res)=>{
    try{
        const monthlyOrders = await Order.aggregate([
            {
                $project: {
                    month: { $month: '$orderDate' },
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: 1 }, 
                },
            },
        ]);
        const monthlySales = await Order.aggregate([
            {
                $project: {
                    month: { $month: '$orderDate' },
                    totalAmount: 1,
                },
            },
            {
                $group: {
                    _id: '$month',
                    total: { $sum: '$totalAmount' },
                },
            },
        ]);

        const monthlyUsers = await User.aggregate([
            {
                $project:{
                    month:{$month:'$createdTime'},

                },
            },
            {
                    $group:{
                        _id:'$month',
                        total:{$sum:1}
                    }
                
            }
        ])
      
                res.json({monthlyOrders,monthlySales,monthlyUsers});
    }catch(error){
        console.log(error.message)
    }
}

const loadMessages = async (req, res) => {
    try {
      
        
        let search = '';
        if(req.query.search){
            search = req.query.search;
        }
        
        const messageData = await Message.find({
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                {email:{$regex:'.*'+search+'.*',$options:'i'}}
        ]})

       
        console.log(messageData)
        res.render('messages',{message:messageData})
    } catch (error) {
        console.log(error.message);
        res.render('../pages/errorAdmin',{error:error.message})
    }
};

const loadReview = async (req, res) => {
    try {
        let search = '';
        if(req.query.search){
            search = req.query.search;
        }
        
        const messageData = await Message.find({
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}},
                {email:{$regex:'.*'+search+'.*',$options:'i'}}
        ]})
        const productWithReviews = await Product.find({
            $or:[
                {name:{$regex:'.*'+search+'.*',$options:'i'}}
                
        ]}
        ).populate('review.userId','name')
 

        let productReview = [];

        productWithReviews.forEach((product) => {
        if (product.review.length > 0) {

            productReview.push(product);
        }
        });

        res.render('reviews',{reviews:productReview})
    } catch (error) {
        console.log(error.message);
        res.render('../pages/errorAdmin',{error:error.message})

    }
};

const errorAdmin = async (req, res) => {
    try {
        res.render('../pages/errorAdmin',{error:"dsdsfsdfdf"})
    } catch (error) {
        console.log(error.message);
    }
};

const updateMessageIconQuantity = async (req, res) => {
    try {
        const count = await Message.countDocuments()
        if(count){
            res.status(200).json({success:true,quantity:count})
        }else{
            res.status(400).json({success:false,quantity:count})
        }
    } catch (error) {
        console.log(error.message);
    }
};
module.exports ={
   loadLogin,
   verifyLogin,
   loadHome,
   logout,
   loadUserList,
   changeStatus,
   loadOrders,
   changeOrderStatus,
   loadOrderDetails,
   loadSalesReport,
   loadChart,
   loadMessages,
   loadReview,
   errorAdmin,
   updateMessageIconQuantity
  
}
    
