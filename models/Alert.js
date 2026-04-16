const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName:  { type: String },
  latitude:  { type: Number, required: true },
  longitude: { type: Number, required: true },
  status:    { type: String, default: 'active' },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Alert', AlertSchema);
