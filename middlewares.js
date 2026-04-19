const Book = require("./models/book.js");
const Review = require("./models/review.js");
const {bookSchema , reviewSchema} = require("./schema.js");

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