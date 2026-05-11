const Joi = require("joi");

module.exports.bookSchema = Joi.object({
    Book: Joi.object({
        title: Joi.string().trim().required(),
        author: Joi.string().trim().required(),
        description: Joi.string().trim().required(),
        year: Joi.number().integer().min(0).required(),
        price: Joi.number().min(0).required(),
        stock: Joi.number().min(0).required(),
    }).required()
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        comment: Joi.string().trim().required(),
        rating: Joi.number().min(1).max(5).required()
    }).required()
});
