const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const ejsmate = require("ejs-mate");
const methodOverride = require("method-override");

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


app.engine("ejs", ejsmate);
app.set("view engine", "ejs");
app.set("views" , path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.static("public"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));

app.get("/" , (req,res) => {
    res.render("books/home");
});

//All books
app.get("/books", async (req, res) => {
    let allBooks = await Book.find();
    res.render("books/index", { allBooks });
});

//Add books
app.get("/books/new" , (req,res) => {
    res.render("books/new");
});

app.post("/books", async (req,res) => {
    const newBook = new Book(req.body.Book);
    await newBook.save();
    res.redirect("/books");
});

//Update Books

app.get("/books/:id/edit" , async (req,res) =>{
    let {id} = req.params;
    let book = await Book.findById(id);
    res.render("books/edit.ejs" , {book});
});

app.put("/books/:id" , async (req,res) => {
    let { id } = req.params;
    const updatedBook = await Book.findByIdAndUpdate(id, req.body.Book, { new: true });
    res.redirect("/books");
});

//Delete Route
app.delete("/books/:id" , async (req,res) => {
    let {id} = req.params;
    await Book.findByIdAndDelete(id);
    res.redirect("/books");
});


//show Route
app.get("/books/:id" , async (req,res) => {
    let {id} = req.params;
    let book1 = await Book.findById(id);
    res.render("books/show" , {book1});
});

app.listen(3000 , () => {
    console.log("Server is running on port 3000");
});