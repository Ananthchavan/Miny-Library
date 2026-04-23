const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    books: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Book" }]
});

module.exports = mongoose.model("Cart", cartSchema);