const mongoose = require("mongoose");
const blogSchema = require("../schemas/blogSchema");
module.exports = mongoose.model("Blog", blogSchema);