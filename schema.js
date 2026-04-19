const joi= require('joi');

module.exports.bookSchema = joi.object({
    book: joi.object({
        title: joi.string().required(),
        author: joi.string().required(),
        description: joi.string().required(),
        year: joi.number().required(),
        image: joi.string().allow("").optional(),
        price: joi.number().required().min(0),
    }).required(),
});

module.exports.reviewSchema = joi.object({
    review: joi.object({
        comment: joi.string().required(),
        rating : joi.number().required().min(1).max(5),
    }).required(),
});
