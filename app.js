if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsmate = require("ejs-mate");
const methodOverride = require("method-override");
const multer = require("multer");
const {storage} = require("./cloudconfig.js");
const upload = multer({storage});
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const Book = require("./models/book.js");
const Review = require("./models/review.js");

const MONGOURL = "mongodb://localhost:27017/library";

main()
    .then( () => {
        console.log("connected to db");
    })
    .catch( (err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGOURL);
}


app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views" , path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));

const sessionOptions = {
    secret: "mysupercode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));

app.use(passport.initialize());
app.use(passport.session());
app.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/" , (req,res) => {
    res.render("books/home");
});

//All books
app.get("/books", async (req, res) => {
    let allBooks = await Book.find();
    res.render("books/index", { allBooks });
});

//Add books
app.get("/books/new" , (req,res) => {
    res.render("books/new");
});

app.post("/books", upload.single("Book[image]") , async (req,res) => { 
    let url = req.file.path; 
    let filename = req.file.filename;
     const newBook = new Book(req.body.Book);
      newBook.image = {url,filename};
       await newBook.save(); 
       res.redirect(`/books/${newBook._id}`); 
});

//Update Books

app.get("/books/:id/edit" , async (req,res) =>{
    let {id} = req.params;
    let book = await Book.findById(id);
    res.render("books/edit.ejs" , {book});
});

app.put("/books/:id", upload.single("Book[image]"), async (req, res) => {
    let { id } = req.params;
    let url = req.file.path;
    let filename = req.file.filename;

    const updatedBook = await Book.findByIdAndUpdate(
        id,
        {
            ...req.body.Book,
            image: { url, filename }
        },
        { new: true }
    );

    res.redirect(`/books/${id}`);
});

//Delete Route
app.delete("/books/:id" , async (req,res) => {
    let {id} = req.params;
    await Book.findByIdAndDelete(id);
    res.redirect("/books");
});

//show Route
app.get("/books/:id" , async (req,res) => {
    let {id} = req.params;
    let book1 = await Book.findById(id).populate("reviews");
    res.render("books/show" , {book1});
});

// <===== Reviews =====>
app.post("/books/:id/reviews" , async (req,res) => {
    let {id} = req.params;
    let book = await Book.findById(id);
    let newReview = new Review(req.body.review);
    book.reviews.push(newReview);
    await newReview.save();
    await book.save();
    res.redirect(`/books/${id}`);
});

app.delete("/books/:id/reviews/:reviewId", async (req, res) => {
    let { id, reviewId } = req.params;
    await Book.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId }
    });
    await Review.findByIdAndDelete(reviewId);
    res.redirect(`/books/${id}`);
});

app.listen(3000 , () => {
    console.log("Server is running on port 3000");
});