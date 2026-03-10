const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");

const Book = require("./models/boook.js");

const MONGOURL = "mongodb://localhost:27017/library";

app.set("view engine" , "ejs");
app.set("views" . path.join(__dirname,"views"));
app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));