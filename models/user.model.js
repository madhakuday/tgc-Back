const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: function () {
      return this.userType !== 'client';
    },
  },
  userType: {
    type: String,
    enum: ['admin', 'client', 'vendor', 'staff', 'subAdmin'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  campIds: {
    type: [String],
    default: [],
  },
  AssignedClientsIds: {
    type: [String],
    default: [],
  },
  AssignedVendorIds: {
    type: [String],
    default: [],
  },
  role: {
    type: [String],
    enum: ['verifier', 'lead_management'],
  },
  configuration: {
    type: {
      path: { type: String, default: "" },
      requestBody: { type: mongoose.Schema.Types.Mixed, default: {} },
      method: { type: String, default: "" },
      headers: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    required: false,
  },
  vendor_api_token: {
    type: String,
  },
},
  { timestamps: true }
);

userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('email')) return next();

  this.email = this.email.toLowerCase();

  const existingUser = await mongoose.models.User.findOne({
    email: this.email,
  }).collation({ locale: 'en', strength: 2 });

  if (existingUser && existingUser._id.toString() !== this._id.toString()) {
    return next(new Error('Email already exists'));
  }

  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Remove configuration for non-client users
userSchema.pre('save', function (next) {
  if (this.userType !== 'client') {
    this.configuration = undefined;
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
