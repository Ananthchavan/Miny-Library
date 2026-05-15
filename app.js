if (process.env.NODE_ENV != "production") {
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsmate = require("ejs-mate");
const methodOverride = require("method-override");
const multer = require("multer");
const { storage } = require("./cloudconfig.js");
const upload = multer({ storage });
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const flash = require("connect-flash");
const nodemailer = require("nodemailer");
const cron = require("node-cron");


const Book = require("./models/book.js");
const Review = require("./models/review.js");
const WishList = require("./models/wishList.js");
const Cart = require("./models/cart.js");
const Borrow = require("./models/borrow.js");
const { isLoggedIn, isOwner, isReviewOwner, validateBook, validateReview, isAdmin } = require("./middlewares.js");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

const MONGOURL = "mongodb://localhost:27017/library";

main()
    .then(() => {
        console.log("connected to db");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGOURL);
}

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS,
    }
});

cron.schedule("0 9 * * *", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const start = new Date(tomorrow);
    start.setHours(0, 0, 0, 0);

    const end = new Date(tomorrow);
    end.setHours(23, 59, 59, 999);


    const borrows = await Borrow.find({
        status: "active",
        dueDate: {
            $gte: start,
            $lte: end,
        }
    }).populate("user").populate("book");


    for (let borrow of borrows) {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: borrow.user.email,
            subject: "Book Return Reminder ",
            text: `Hi ${borrow.user.username}, your borrowed book "${borrow.book.title}" is due tomorrow. Please return it to avoid fines.`
        });
    }
});

app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
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


// Home Page
app.get("/", (req, res) => {
    res.render("books/home");
});

// Profile Page
app.get("/profile", (req, res) => {
    res.render("users/profile");
})

// My Reviews
app.get("/myreviews", isLoggedIn, wrapAsync(async (req, res) => {
    const books = await Book.find({ reviews: { $exists: true, $ne: [] } })
        .populate({
            path: "reviews",
            populate: { path: "author" }
        });

    const myReviews = [];
    for (let book of books) {
        for (let review of book.reviews) {
            if (review.author._id.equals(req.user._id)) {
                myReviews.push({
                    bookTitle: book.title,
                    bookId: book._id,
                    comment: review.comment,
                    rating: review.rating,
                    createdAt: review.createdAt,
                    reviewId: review._id,
                });
            }
        }
    }

    res.render("users/myreviews", { myReviews });
}));

// Search Books
app.post("/search", wrapAsync(async (req, res) => {
    let { search } = req.body;
    const allBooks = await Book.find({
        $or: [
            { title: { $regex: search, $options: "i" } },
            { author: { $regex: search, $options: "i" } }
        ]
    }).populate({
        path: "reviews",
        populate: { path: "author" }
    }).populate("owner");

    if (!allBooks) {
        req.flash("error", "Book with that name not found");
        return res.redirect("/books");
    }

    res.render("books/index", { allBooks });
}));

// <=========== Books  =============>

// Index - List All Books
app.get("/books", wrapAsync(async (req, res) => {
    let allBooks = await Book.find();
    res.render("books/index", { allBooks });
}));

// New - Add Book Form
app.get("/books/new", isLoggedIn, isAdmin, (req, res) => {
    res.render("books/new");
});

// Create - Save New Book
app.post("/books", isLoggedIn, isAdmin, upload.single("Book[image]"), validateBook, wrapAsync(async (req, res) => {
    let url = req.file.path;
    let filename = req.file.filename;
    const newBook = new Book(req.body.Book);
    newBook.image = { url, filename };
    newBook.owner = req.user._id;
    await newBook.save();
    req.flash("success", "Book Added");
    res.redirect(`/books/${newBook._id}`);
}));

// Edit - Edit Book Form
app.get("/books/:id/edit", isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let book = await Book.findById(id);
    if (!book) {
        req.flash("error", "The book dosent exist");
        return res.redirect("/books");
    }
    res.render("books/edit.ejs", { book });
}));

// Update - Save Edited Book
app.put("/books/:id", isLoggedIn, isAdmin, upload.single("Book[image]"), validateBook, wrapAsync(async (req, res) => {
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
    req.flash("success", "Book Updated");
    res.redirect(`/books/${id}`);
}));

// Delete - Remove Book
app.delete("/books/:id", isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Book.findByIdAndDelete(id);
    req.flash("success", "Book Deleted");
    res.redirect("/books");
}));

// Show - Book Details Page
app.get("/books/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    let book1 = await Book.findById(id)
        .populate({
            path: "reviews",
            populate: {
                path: "author"
            }
        })
        .populate("owner");
    if (!book1) {
        req.flash("error", "The book dosent exist");
        return res.redirect("/books");
    }
    res.render("books/show", { book1 });
}));

// <========== Reviews ==========>
// Create Review
app.post("/books/:id/reviews", isLoggedIn, validateReview, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let book = await Book.findById(id);
    let newReview = new Review(req.body.review);
    book.reviews.push(newReview);
    newReview.author = res.locals.currentUser._id;
    await newReview.save();
    await book.save();
    req.flash("success", "Review created");
    res.redirect(`/books/${id}`);
}));

// Delete Review
app.delete("/books/:id/reviews/:reviewId", isLoggedIn, isReviewOwner, wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Book.findByIdAndUpdate(id, {
        $pull: { reviews: reviewId }
    });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted");
    res.redirect(`/books/${id}`);
}));

// <============ WISHLIST ROUTES ===============>
// Show Wishlist
app.get("/wishlist", isLoggedIn, wrapAsync(async (req, res) => {
    let wishList = await WishList.findOne({ user: req.user._id }).populate("books");
    res.render("wishlist/index.ejs", { wishList });
}));

// Add to Wishlist
app.post("/wishlist/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;

    await WishList.findOneAndUpdate(
        { user: req.user._id },
        { $addToSet: { books: id } },
        { upsert: true, new: true },
    );

    req.flash("success", "Book sucessfully added to wish List");
    res.redirect(`/books/${id}`);
}));

// Remove from Wishlist
app.delete("/wishlist/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    await WishList.findOneAndUpdate(
        { user: req.user._id },
        { $pull: { books: id } }
    );
    req.flash("success", "Book removed from wishList");
    res.redirect("/wishlist");
}));

// <=============== CART ===================>

// Show Cart
app.get("/cart", isLoggedIn, wrapAsync(async (req, res) => {
    let cart = await Cart.findOne({ user: req.user._id }).populate("books.book");
    res.render("cart/cart.ejs", { cart });
}));

// Add to Cart
app.post("/cart/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
        cart = new Cart({ user: req.user._id, books: [] });
    }

    const existingItem = cart.books.find(b => b.book.toString() === id.toString());

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.books.push({ book: id, quantity: 1 });
    }

    await cart.save();

    req.flash("success", "Book sucessfully added to Cart");
    res.redirect(`/books/${id}`);
}));

// Update Cart Quantity
app.patch("/cart/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let { quantity } = req.body;
    quantity = parseInt(quantity);

    if (!quantity || quantity < 1) {
        req.flash("error", "Quantity must be at least 1");
        return res.redirect("/cart");
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
        const item = cart.books.find(b => b.book.toString() === id.toString());
        if (item) {
            item.quantity = quantity;
            await cart.save();
        }
    }

    req.flash("success", "Cart updated");
    res.redirect("/cart");
}));

// Remove from Cart
app.delete("/cart/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $pull: { books: { book: id } } },
    );
    req.flash("success", "Book removed from Cart");
    res.redirect("/cart");
}));

// <======================= BORROW ROUTES =====================> 

// Admin - All Borrow Records
app.get("/borrow/admin", isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    const borrows = await Borrow.find({})
        .populate("book")
        .populate("user")
        .sort({ borrowedAt: -1 });

    res.render("borrow/admin", { borrows });
}));

// Borrow - Select Duration Form
app.get("/borrow/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;

    const book = await Book.findById(id);
    if (!book) {
        req.flash("error", "Book not Found");
        return res.redirect("/books");
    }

    const exsisting = await Borrow.findOne({
        user: req.user._id,
        book: book._id,
        status: "active"
    });

    if (exsisting) {
        req.flash("error", "You have already borrowed this book");
        return res.redirect(`/books/${book._id}`);
    }

    const dailyRate = parseFloat((2 / 100) * book.price).toFixed(2);
    const options = [7, 14, 21, 28].map(d => ({
        days: d,
        charge: parseFloat((dailyRate * d).toFixed(2)),
    }));
    res.render("borrow/new", { book, options });
}));

// Borrow - Create Borrow Record
app.post("/borrow/:id", isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const days = parseInt(req.body.days);

    const book = await Book.findById(id);
    if (!book) {
        req.flash("error", "Book not Found");
        return res.redirect("/books");
    }

    if (![7, 14, 21, 28].includes(days)) {
        req.flash("error", "Invalid Borrow duration");
        return res.render(`/borrow/${book._id}`);
    }

    const borrowedAt = new Date();
    const dueDate = new Date(borrowedAt);
    dueDate.setDate(dueDate.getDate() + days);

    const dailyRate = (2 / 100) * book.price;
    const charge = parseFloat((dailyRate * days).toFixed(2));

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
    book.stock -= 1;
    await book.save();


    req.flash("success", `Borrowed for ${days} days! Return by ${dueDate.toDateString()}. Charge: ${charge}`);
    res.redirect("/borrow");
}));

// Admin - Return Book
app.patch("/borrow/:id/return", isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const borrow = await Borrow.findById(id).populate("book");
    const book = borrow.book;

    if (!borrow) {
        req.flash("error", "Borrow record not found");
        return res.return("/borrow/admin");
    }

    if (borrow.status === "returned") {
        req.flash("error", "This book is already returned.");
        return res.redirect("/admin/borrows");
    }

    let fine = 0;
    const returnedAt = new Date();
    const daysActuallyBorrowed = Math.ceil((returnedAt - borrow.borrowedAt) / (1000 * 60 * 60 * 24));
    const dailyRate = (2 / 100) * borrow.book.price;
    const charge = parseFloat((dailyRate * daysActuallyBorrowed).toFixed(2));

    if (returnedAt > borrow.dueDate) {
        const overdueDays = Math.ceil((returnedAt - borrow.dueDate) / (1000 * 60 * 60 * 24));
        fine = parseFloat((overdueDays * dailyRate * 1.5).toFixed(2));
    }

    const totalAmount = parseFloat((charge + fine).toFixed(2));

    await Borrow.findByIdAndUpdate(borrow._id, {
        returnedAt,
        status: "returned",
        charge,
        fine,
        totalAmount,
    });
    book.stock += 1;
    await book.save();

    req.flash("success", `Book returned. Total charged: ₹${totalAmount}`);
    res.redirect("/borrow/admin");
}));


// Admin - Delete Borrow Record
app.delete("/borrow/:id/delete", isLoggedIn, isAdmin, wrapAsync(async (req, res) => {
    let { id } = req.params;

    await Borrow.findByIdAndDelete(id);
    req.flash("success", "Record successfully deleted");
    res.redirect("/borrow/admin");
}));


// User - My Borrows
app.get("/borrow", isLoggedIn, wrapAsync(async (req, res) => {
    const borrows = await Borrow.find({ user: req.user._id }).populate("book").sort({ borrowedAt: -1 });
    const today = Date.now();

    for (let borrow of borrows) {
        if (borrow.status === "active" && today > borrow.dueDate) {
            const overdueDays = Math.ceil((today - borrow.dueDate) / (1000 * 60 * 60 * 24));
            const dailyRate = (2 / 100) * borrow.book.price;
            const fine = parseFloat((overdueDays * dailyRate * 1.5).toFixed(2));
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

    res.render("borrow/index", { borrows });
}));


// <========== USER ROUTES =============>
// Signup Form
app.get("/signup", (req, res) => {
    res.render("users/signup");
});

// Create User Account
app.post("/signup", wrapAsync(async (req, res) => {
    try {
        let { username, email, password } = req.body;
        const newUser = new User({ email, username, role: "user" });
        const registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "SignUp Successfull");
            res.redirect("/books");
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}));

// Login Form
app.get("/login", (req, res) => {
    res.render("users/login");
})

// Login User
app.post("/login",
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        req.flash("success", "Login Successfull");
        let redirectUrl = res.locals.redirectUrl || "/books";
        res.redirect(redirectUrl);
    }
);

// Logout User
app.get("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        req.flash("success", "Logout Successfull");
        res.redirect("/books");
    });
});

// Forgot Password Form
app.get("/forgotpass", (req, res) => {
    res.render("users/newpass");
});

// Reset Password
app.post("/newpass", wrapAsync(async (req, res) => {
    try {
        let { username, email, newPassword } = req.body;
        const currUser = await User.findOne({
            username,
            email,
        });

        if (!currUser) {
            req.flash("error", "Wrong credentials");
            return res.redirect("/forgotpass");
        }
        await currUser.setPassword(newPassword);
        await currUser.save();
        req.flash("success", "Password Changed");
        res.redirect("/login");
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/forgotpass");
    }
}));

// <==================== ADMIN ROUTES ==================>
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Admin Signup Form
app.get("/admin/signup", (req, res) => {
    res.render("admin/signup.ejs");
});

// Create Admin Account
app.post("/admin/signup", wrapAsync(async (req, res) => {
    const { username, email, password, secretCode } = req.body;

    if (secretCode !== ADMIN_SECRET) {
        req.flash("error", "Invalid secret code");
        return res.redirect("/admin/signup");
    }

    const newUser = new User({ username, email, role: "admin" });
    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
        if (err) return next(err);
        req.flash("success", "Admin account created!");
        res.redirect("/books");
    });
}));

// 404 Handler
app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

// Error Handler
app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    const message = err.message || "Something went wrong";

    res.status(status).render("error.ejs", { err });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});