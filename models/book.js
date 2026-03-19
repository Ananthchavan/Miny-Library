const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const bookSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true,
    },
    description: String,
    year: Number,
    image: String,
    price: Number,
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: "Review",
    }],
});

const Book = mongoose.model("Book" , bookSchema);
module.exports = Book;