const mongoose = require("mongoose");
const passwordResetSchema = require("../schemas/passwordResetSchema");
module.exports = mongoose.model("PasswordReset", passwordResetSchema);