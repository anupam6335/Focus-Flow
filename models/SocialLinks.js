/**
 * Social Links Model
 * Stores user's social media and coding platform links
 */

import mongoose from 'mongoose';

const socialLinksSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true,
    unique: true,
    ref: 'User'
  },
  links: {
    linkedin: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v) {
          return !v || v.includes('linkedin.com');
        },
        message: 'Please provide a valid LinkedIn URL'
      }
    },
    github: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v) {
          return !v || v.includes('github.com');
        },
        message: 'Please provide a valid GitHub URL'
      }
    },
    leetcode: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v) {
          return !v || v.includes('leetcode.com');
        },
        message: 'Please provide a valid LeetCode URL'
      }
    },
    gfg: { 
      type: String, 
      default: '',
      validate: {
        validator: function(v) {
          return !v || v.includes('geeksforgeeks.org');
        },
        message: 'Please provide a valid GeeksForGeeks URL'
      }
    },
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  },
}, {
  timestamps: true
});

// Index for user lookup
socialLinksSchema.index({ userId: 1 });

export default mongoose.model('SocialLinks', socialLinksSchema);