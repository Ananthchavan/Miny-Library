const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const wishlistSchema = new Schema({
  user: { type: Schema.Types.ObjectId,
     ref: "User", 
     required: true, 
     unique: true },
  books: [{ 
    type: Schema.Types.ObjectId, 
    ref: "Book" }],
}, { timestamps: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);