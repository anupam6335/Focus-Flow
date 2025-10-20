const mongoose = require("mongoose");
const socialLinksSchema = require("../schemas/socialLinksSchema");
module.exports = mongoose.model("SocialLinks", socialLinksSchema);