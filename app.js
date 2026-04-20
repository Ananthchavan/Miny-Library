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
const flash = require("connect-flash");


const Book = require("./models/book.js");
const Review = require("./models/review.js");
const {isLoggedIn,isOwner,isReviewOwner,validateBook,validateReview} = require("./middlewares.js");
const wrapAsync = require("./utils/wrapAsync.js");

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
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});


app.get("/" , (req,res) => {
    res.render("books/home");
});

// <=========== Books  =============>
app.get("/books", wrapAsync(async (req, res) => {
    let allBooks = await Book.find();
    res.render("books/index", { allBooks });
}));

//Add books
app.get("/books/new" ,isLoggedIn, (req,res) => {
    res.render("books/new");
});

app.post("/books", isLoggedIn  ,upload.single("Book[image]"), validateBook ,wrapAsync(async (req,res) => { 
    let url = req.file.path; 
    let filename = req.file.filename;
     const newBook = new Book(req.body.Book);
      newBook.image = {url,filename};
      newBook.owner = req.user._id;
       await newBook.save();
       req.flash("success" , "Book Added"); 
       res.redirect(`/books/${newBook._id}`); 
}) );

//Update Books

app.get("/books/:id/edit" , isLoggedIn ,isOwner,  wrapAsync(async (req,res) =>{
    let {id} = req.params;
    let book = await Book.findById(id);
    if(!book){
        req.flash("error" , "The book dosent exist");
        return res.redirect("/books");
    }
    res.render("books/edit.ejs" , {book});
}) );

app.put("/books/:id", isLoggedIn ,isOwner, upload.single("Book[image]"), validateBook ,wrapAsync(async (req, res) => {
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
    req.flash("success" , "Book Updated");
    res.redirect(`/books/${id}`);
}) );

//Delete Route
app.delete("/books/:id" , isLoggedIn ,isOwner, wrapAsync(async (req,res) => {
    let {id} = req.params;
    await Book.findByIdAndDelete(id);
    req.flash("success" , "Book Deleted");
    res.redirect("/books");
}) );

//show Route
app.get("/books/:id" , wrapAsync(async (req,res) => {
    let {id} = req.params;
    let book1 = await Book.findById(id)
    .populate({
        path: "reviews",
        populate: {
            path: "author"
        }
    })
    .populate("owner");
    if(!book1){
        req.flash("error" , "The book dosent exist");
        return res.redirect("/books");
    }
    res.render("books/show" , {book1});
}) );

// <========== Reviews ==========>
app.post("/books/:id/reviews" , isLoggedIn , validateReview , wrapAsync(async (req,res) => {
    let {id} = req.params;
    let book = await Book.findById(id);
    let newReview = new Review(req.body.review);
    book.reviews.push(newReview);
    newReview.author = res.locals.currentUser._id;
    await newReview.save();
    await book.save();
    req.flash("success" , "Review created");
    res.redirect(`/books/${id}`);
}) );

app.delete("/books/:id/reviews/:reviewId", isLoggedIn, isReviewOwner , wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Book.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId }
    });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success" , "Review Deleted");
    res.redirect(`/books/${id}`);
}) );

// <========== USER ROUTES =============>
app.get("/signup" , (req,res) => {
    res.render("users/signup");
});

app.post("/signup", wrapAsync(async (req,res) => {
    try{
        let {username , email , password} = req.body;
        const newUser = new User({email,username});
        const registeredUser = await User.register(newUser,password);
        req.login(registeredUser , (err) => {
            if(err){
                return next(err);
            }
            req.flash("success" , "SignUp Successfull");
            res.redirect("/books");
        });
    } catch(e){
        req.flash("error" , e.message);
        res.redirect("/signup");
    }
}) );

app.get("/login" , (req,res) => {
    res.render("users/login");
})

app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success" , "Login Successfull");
        let redirectUrl = res.locals.redirectUrl || "/books";
        res.redirect(redirectUrl);
    }
);

app.get("/logout", (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        req.flash("success" , "Logout Successfull");
        res.redirect("/books");
    });
});

app.use((req,res,next) => {
    next(new ExpressError(404 , "Page Not Found"));
});

app.use((err,req,res,next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Something went wrong";

    res.status(status).render("error.ejs" , {err});
});

app.listen(3000 , () => {
    console.log("Server is running on port 3000");
});