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
const WishList = require("./models/wishList.js");
const Cart = require("./models/cart.js");
const Borrow = require("./models/borrow.js");
const {isLoggedIn,isOwner,isReviewOwner,validateBook,validateReview,isAdmin} = require("./middlewares.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

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

app.get("/profile" , (req,res) => {
    res.render("users/profile");
})

// <=========== Books  =============>
app.get("/books", wrapAsync(async (req, res) => {
    let allBooks = await Book.find();
    res.render("books/index", { allBooks });
}));

//Add books
app.get("/books/new" ,isLoggedIn, isAdmin , (req,res) => {
    res.render("books/new");
});

app.post("/books", isLoggedIn , isAdmin ,upload.single("Book[image]"), validateBook ,wrapAsync(async (req,res) => { 
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

app.get("/books/:id/edit" , isLoggedIn ,isAdmin,  wrapAsync(async (req,res) =>{
    let {id} = req.params;
    let book = await Book.findById(id);
    if(!book){
        req.flash("error" , "The book dosent exist");
        return res.redirect("/books");
    }
    res.render("books/edit.ejs" , {book});
}) );

app.put("/books/:id", isLoggedIn , isAdmin ,upload.single("Book[image]"), validateBook ,wrapAsync(async (req, res) => {
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
app.delete("/books/:id" , isLoggedIn , isAdmin , wrapAsync(async (req,res) => {
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

// <============ WISHLIST ROUTES ===============>
app.get("/wishlist" ,isLoggedIn , wrapAsync(async(req,res) => {
    let wishList = await WishList.findOne({user: req.user._id}).populate("books");
    res.render("wishlist/index.ejs" , {wishList});
}) );

app.post("/wishlist/:id" , isLoggedIn , wrapAsync(async (req,res) => {
    const {id} = req.params;

    await WishList.findOneAndUpdate(
        {user: req.user._id},
        { $addToSet :{books : id} },
        {upsert: true, new: true},
    );

    req.flash("success" , "Book sucessfully added to wish List");
    res.redirect(`/books/${id}`);
}));

app.delete("/wishlist/:id" , isLoggedIn , wrapAsync(async(req,res) => {
    let {id} = req.params;
    await WishList.findOneAndUpdate(
        {user: req.user._id},
        {$pull : {books: id}}
    );
    req.flash("success" ,"Book removed from wishList");
    res.redirect("/wishlist");
}));

// <=============== CART ===================>

app.get("/cart" , isLoggedIn ,wrapAsync(async (req,res) => {
    let cart = await Cart.findOneAndUpdate({user: req.user._id}).populate("books");
    res.render("cart/cart.ejs" , {cart});
}) );

app.post("/cart/:id" , isLoggedIn , wrapAsync(async (req,res) => {
    let {id} = req.params;

    await Cart.findOneAndUpdate(
        {user: req.user._id},
        {$addToSet : {books: id}},
        {upsert: true, new: true},
    );

    req.flash("success" , "Book sucessfully added to Cart");
    res.redirect(`/books/${id}`);
}));

app.delete("/cart/:id" , isLoggedIn , wrapAsync(async (req,res) => {
    let {id} = req.params;
    await Cart.findOneAndUpdate(
        {user: req.user._id},
        {$pull : {books: id}},
    );
    req.flash("success" ,"Book removed from Cart");
    res.redirect("/cart");
}) );

// <======================= BORROW ROUTES =====================> 

app.get("/borrow/admin" , isLoggedIn , isAdmin ,wrapAsync(async(req,res) => {
    const borrows = await Borrow.find({})
        .populate("book")
        .populate("user")
        .sort({ borrowedAt: -1 });

    res.render("borrow/admin" , {borrows});
}));

app.get("/borrow/:id" , isLoggedIn , wrapAsync(async (req,res) => {
    let {id} = req.params;

    const book = await Book.findById(id);
    if(!book) {
        req.flash("error" , "Book not Found");
        return res.redirect("/books");
    }

    const exsisting = await Borrow.findOne({
        user: req.user._id,
        book: book._id,
        status: "active"
    });

    if(exsisting) {
        req.flash("error" , "You have already borrowed this book");
        return res.redirect(`/books/${book._id}`);
    }

    const dailyRate = parseFloat((2/100) * book.price).toFixed(2);
    const options = [7,14,21,28].map(d => ({
        days: d,
        charge: parseFloat( (dailyRate * d).toFixed(2) ),
    }));
    res.render("borrow/new" , {book , options});
}) );

app.post("/borrow/:id" , isLoggedIn , wrapAsync( async(req,res) => {
    let {id} = req.params;
    const days = parseInt(req.body.days);
    
    const book = await Book.findById(id);
    if(!book) {
        req.flash("error" , "Book not Found");
        return res.redirect("/books");
    }

    if(![7,14,21,28].includes(days)){
        req.flash("error" , "Invalid Borrow duration");
        return res.render(`/borrow/${book._id}`);
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + days);

    const dailyRate = (2/100) * book.price;
    const charge = parseFloat( (dailyRate * days).toFixed(2) );

    await Borrow.create({
        user: req.user._id,
        book: book._id,
        borrowedAt,
        dueDate,
        days: days,
        status: "active",
        charge,
        totalAmount: charge
    });

    req.flash("success", `Borrowed for ${days} days! Return by ${dueDate.toDateString()}. Charge: ${charge}`);
    res.redirect("/borrow");
}));

app.get("/borrow" , isLoggedIn , wrapAsync( async(req,res) => {
    const borrows = await Borrow.find({user: req.user._id}).populate("book").sort({ borrowedAt: -1 });
    const today = Date.now();

    for(let borrow of borrows){
        if(borrow.status === "active" && today > borrow.dueDate) {
            const overdueDays = Math.ceil( (today - borrow.dueDate)/ (1000*60*60*24));
            const dailyRate = (2/100) * borrow.book.price;
            const fine = parseFloat( (overdueDays * dailyRate * 1.5).toFixed(2));
            await Borrow.findByIdAndUpdate(borrow._id, {
                    status: "overdue",
                    fine: fine,
                    totalAmount: parseFloat((borrow.charge + fine).toFixed(2)),
                    });

            borrow.status = "overdue";
            borrow.fine = fine;
            borrow.totalAmount = parseFloat((borrow.charge + fine).toFixed(2));
        }
    }

    res.render("borrow/index" , { borrows });
}));


// <========== USER ROUTES =============>
app.get("/signup" , (req,res) => {
    res.render("users/signup");
});

app.post("/signup", wrapAsync(async (req,res) => {
    try{
        let {username , email , password} = req.body;
        const newUser = new User({email,username,role: "user"});
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

// <==================== ADMIN ROUTES ==================>
const ADMIN_SECRET = "Thala67";

app.get("/admin/signup" , (req,res) => {
   res.render("admin/signup.ejs"); 
});

app.post("/admin/signup" , async (req,res) => {
    const { username, email, password, secretCode } = req.body;

    if(secretCode !== ADMIN_SECRET){
        req.flash("error" , "Invalid secret code");
        return res.redirect("/admin/signup");
    }

    const newUser = new User({ username, email, role: "admin" });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash("success", "Admin account created!");
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