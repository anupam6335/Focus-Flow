const mongoose = require("mongoose");
const checklistDataSchema = require("../schemas/checklistDataSchema");
module.exports = mongoose.model("ChecklistData", checklistDataSchema);