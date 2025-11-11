/**
 * Password Reset Model - Enhanced security for OTP handling
 */

import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  otp: { 
    type: String, 
    required: true 
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: { expires: 0 }
  },
  used: { 
    type: Boolean, 
    default: false 
  },
  attempts: {
    type: Number,
    default: 0
  },
  ipAddress: { // NEW: Track request origin for security
    type: String,
    default: null
  },
  userAgent: { // NEW: Track client info for security
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
passwordResetSchema.index({ email: 1, otp: 1 });
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create OTP with security info
passwordResetSchema.statics.createOTP = async function(email, ipAddress = null, userAgent = null) {
  // Delete any existing OTPs for this email
  await this.deleteMany({ email });
  
  // Generate 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return this.create({
    email,
    otp,
    expiresAt,
    ipAddress,
    userAgent
  });
};

// Static method to validate OTP
passwordResetSchema.statics.validateOTP = async function(email, otp) {
  const resetRecord = await this.findOne({
    email,
    otp,
    expiresAt: { $gt: new Date() },
    used: false,
  });

  if (resetRecord) {
    // Increment attempts
    resetRecord.attempts += 1;
    await resetRecord.save();
    return resetRecord;
  }
  
  return null;
};

// Static method to mark OTP as used
passwordResetSchema.statics.markAsUsed = async function(email, otp) {
  return this.findOneAndUpdate(
    { email, otp },
    { used: true },
    { new: true }
  );
};

// Static method to get OTP usage stats (admin only)
passwordResetSchema.statics.getOTPStats = async function(email = null) {
  const query = {};
  if (email) query.email = email;
  
  const totalOTPs = await this.countDocuments(query);
  const usedOTPs = await this.countDocuments({ ...query, used: true });
  const expiredOTPs = await this.countDocuments({ 
    ...query, 
    expiresAt: { $lt: new Date() } 
  });
  
  return {
    total: totalOTPs,
    used: usedOTPs,
    expired: expiredOTPs,
    active: totalOTPs - usedOTPs - expiredOTPs
  };
};

export default mongoose.model('PasswordReset', passwordResetSchema);