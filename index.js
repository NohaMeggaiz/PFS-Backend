const port =4000;
const express = require("express");
const app =express();
const mongoose =require("mongoose");
const jwt = require("jsonwebtoken");
const multer =require("multer");
const path=require("path");
const cors = require("cors");
const { availableParallelism } = require("os");
const { error, log } = require("console");

app.use(express.json());
app.use(cors());

//databse connection with mongodb
mongoose.connect("mongodb+srv://nohame2611:ecommerce@cluster0.wer5lrd.mongodb.net/e-commerce");
//api creation
app.get("/",(req,res)=>{
    res.send("Express app is running")
})


//image storage
const storage =multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})
// create upload endpoint for images

app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

//schema for creating products

const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    }, 
    image:{
        type:String,
        required:true,

    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,

    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,

    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({});
    let id;

    if (products.length > 0) {
        let lastProduct = products[products.length - 1];
        id = lastProduct.id + 1;
    } else {
        id = 1;
    }


    const product =new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
       
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})


//creating api for deleting products
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("removed!! :-(");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//creating api for getting all products
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        console.log("All products fetched :-) ");
        res.send(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// schema for creating user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//creating endpoint for enregistrer l'user

//const jwt = require('jsonwebtoken');

app.post('/signup', async (req, res) => {
    try {
        let check = await Users.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: "An existing user was found with the same email" });
        }
        
        const cart = {};
        for (let i = 0; i < 300; i++) { // corrected typo in cart initialization
            cart[i] = 0;
        }

        const user = new Users({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart, // corrected typo in cart data field name
        });

        await user.save();
        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error("Error during user registration:", error);
        res.status(500).json({ success: false, errors: "An error occurred during user registration" });
    }
});

//endpoint for login

 app.post('/login',async(req,res)=>{
    let user =await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password ===user.password;
        if(passCompare){
            const data ={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token})
        }
        else{
            res.json({success:false,errors:"Wrong password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email"})
    }
})
//endpoint for newcollections
app.get('/newcollections',async(req,res)=>{
    let products =await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("newcollections fetched ~_~ ");
    res.send(newcollection);


})

//endpint for popularin women
app.get('/popularInwomen' ,async(req,res)=>{
    let products =await Product.find({category:"women"});
    let popwom=products.slice(0,4);
    console.log("popularInwomen  fetched *-* ");
    res.send(popwom);


})

//creating middelware to fetch user
const fetchUser = async (req, res, next) => { // Add 'next' as a parameter
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({ errors: "Please authenticate using valid token" });
    } else {
        try {
            const data = jwt.verify(token, 'secret_ecom');
            req.user = data.user;
            next(); // Call 'next' to pass control to the next middleware
        } catch (error) {
            res.status(401).send({ errors: "Please authenticate using valid token" });
        }
    }
}



//end point for adding products in cartdata
// Point de terminaison pour ajouter des produits dans cartdata
app.post('/addtocart', fetchUser, async (req, res) => {
    console.log(req.body, req.user);
 
    let userData = await Users.findOne({ _id: req.user.id });
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Ajouté");
 });
 
//creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser,async(req,res)=>{
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({ _id: req.user.id });
    if(userData.cartData[req.body.itemId]>0)
       userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
    res.send("Supprimé");


});

app.post('/getcart', fetchUser, async (req, res) => {
    console.log("Récupération du panier");
    let userData = await Users.findOne({ _id: req.user.id });
    res.json(userData.cartData);
});




app.listen(port,(error)=>{
    if(!error){
        console.log("server running on port"+port);
    }
    else{
        console.log("error"+error);
    }

})