const mongoose = require("mongoose");

const sampleBooks = [
{
  title: "Atomic Habits",
  author: "James Clear",
  description: "A practical guide to building good habits and breaking bad ones.",
  year: 2018,
  image: {
    url: "https://images.unsplash.com/photo-1552728089-57bdde30beb3",
    filename: "library_images"
  },
  price: 499,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "The Alchemist",
  author: "Paulo Coelho",
  description: "A philosophical novel about following your dreams.",
  year: 1988,
  image: {
    url: "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
    filename: "library_images"
  },
  price: 350,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Clean Code",
  author: "Robert C. Martin",
  description: "A handbook of agile software craftsmanship.",
  year: 2008,
  image: {
    url: "https://images.unsplash.com/photo-1512820790803-83ca734da794",
    filename: "library_images"
  },
  price: 650,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Deep Work",
  author: "Cal Newport",
  description: "Rules for focused success in a distracted world.",
  year: 2016,
  image: {
    url: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f",
    filename: "library_images"
  },
  price: 420,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "The Pragmatic Programmer",
  author: "Andrew Hunt & David Thomas",
  description: "Essential tips and practices for programmers.",
  year: 1999,
  image: {
    url: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
    filename: "library_images"
  },
  price: 700,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Rich Dad Poor Dad",
  author: "Robert Kiyosaki",
  description: "Personal finance book about financial independence.",
  year: 1997,
  image: {
    url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
    filename: "library_images"
  },
  price: 300,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Think and Grow Rich",
  author: "Napoleon Hill",
  description: "Classic book on success principles and mindset.",
  year: 1937,
  image: {
    url: "https://images.unsplash.com/photo-1473755504818-b72b6dfdc226",
    filename: "library_images"
  },
  price: 280,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Zero to One",
  author: "Peter Thiel",
  description: "Notes on startups and building the future.",
  year: 2014,
  image: {
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
    filename: "library_images"
  },
  price: 450,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Start With Why",
  author: "Simon Sinek",
  description: "Explores how great leaders inspire action.",
  year: 2009,
  image: {
    url: "https://images.unsplash.com/photo-1507842217343-583bb7270b66",
    filename: "library_images"
  },
  price: 390,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Eloquent JavaScript",
  author: "Marijn Haverbeke",
  description: "A modern introduction to programming using JavaScript.",
  year: 2018,
  image: {
    url: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    filename: "library_images"
  },
  price: 520,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "You Don't Know JS",
  author: "Kyle Simpson",
  description: "Deep dive into the core mechanisms of JavaScript.",
  year: 2015,
  image: {
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
    filename: "library_images"
  },
  price: 480,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
},
{
  title: "Designing Data-Intensive Applications",
  author: "Martin Kleppmann",
  description: "Comprehensive guide to building scalable systems.",
  year: 2017,
  image: {
    url: "https://images.unsplash.com/photo-1517433456452-f9633a875f6f",
    filename: "library_images"
  },
  price: 850,
  reviews: [],
  owner: new mongoose.Types.ObjectId("69e117d19137eb8425acc0c1")
}
];

module.exports = { data: sampleBooks };