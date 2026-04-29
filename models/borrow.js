const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const borrowSchema = new Schema({
  user: {
     type: Schema.Types.ObjectId, 
     ref: "User", required: true 
    },
  book: {
     type: Schema.Types.ObjectId, 
     ref: "Book", required: true
     },
  borrowedAt: {
     type: Date,
      default: Date.now 
    },
  dueDate: { 
    type: Date,
     required: true 
    },
  returnedAt: { type: Date },
  days: { 
    type: Number,
     required: true 
    },      
  status: {
    type: String,
    enum: ["active", "returned", "overdue"],
    default: "active",
  },
  charge: { type: Number },        
  fine: { 
    type: Number, 
    default: 0
 },
  totalAmount: { type: Number },
});

module.exports = mongoose.model("Borrow", borrowSchema);