const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    books: [{ 
        book: { type: mongoose.Schema.Types.ObjectId, ref: "Book" },
        quantity: { type: Number, default: 1, min: 1 }
    }]
});

module.exports = mongoose.model("Cart", cartSchema);