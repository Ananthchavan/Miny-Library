const Book = require("./models/book.js");
const Review = require("./models/review.js");
const {bookSchema , reviewSchema} = require("./schema.js");
const ExpressError = require("./utils/ExpressError.js");

module.exports.isLoggedIn = (req,res,next) => {
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("error" , "You must be logged in");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req,res,next) => {
    if(req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}

module.exports.isOwner = async(req,res,next) => {
    let {id} = req.params;
    let book = await Book.findById(id);
    if(!book.owner.equals(res.locals.currentUser._id)) {
        req.flash("error" , "You are not the owner");
        return res.redirect(`/books/${id}`);
    }
    next();
};

module.exports.isReviewOwner = async (req,res,next) => {
    let {id, reviewId} = req.params;
    let review = await Review.findById(reviewId);
    if(!review.author.equals(res.locals.currentUser._id)){
        req.flash("error" , "You are not the Owner");
        return res.redirect(`/books/${id}`);
    }
    next();
};

module.exports.validateBook = (req,res,next) => {
    let {error} = bookSchema.validate(req.body);
    if(error) {
        let errMsg = error.details.map(el => el.message).join(",");
        throw new ExpressError(400 , errMsg);
    } else {
        next();
    }
};

module.exports.validateReview = (req,res,next) => {
        let {error} = reviewSchema.validate(req.body);
        if(error){
           let errMsg = error.details.map(el => el.message).join(", "); 
            throw new ExpressError(400 , errMsg);
        } else {
            next();
        }
};