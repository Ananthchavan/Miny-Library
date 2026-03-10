const mongoose = require("mongoose");
const initData = require("./data.js");
const Book = require("../models/book.js");

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

const initDB = async () => {
    await Book.insertMany(initData.data);
    console.log("Data Base initilized");
}

initDB();