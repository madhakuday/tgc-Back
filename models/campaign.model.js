const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  questions: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
      isRequired: { type: Boolean, default: false }
    }
  ],
}, { timestamps: true });

const Campaign = mongoose.model('Campaign', campaignSchema);
module.exports = Campaign;
