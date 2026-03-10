const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");

const Book = require("./models/book.js");

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



app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));

app.get("/" , (req,res) => {
    res.send("Working :)");
});

app.listen(3000 , () => {
    console.log("Server is running on port 3000");
});