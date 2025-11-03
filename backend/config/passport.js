/**
 * Passport Configuration
 * OAuth strategies and authentication setup
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User.js';
import ChecklistData from '../models/ChecklistData.js';
import config from './environment.js';

/**
 * Passport serialization
 */
passport.serializeUser((user, done) => {
  done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
  try {
    const user = await User.findOne({ username });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

/**
 * Google OAuth Strategy
 */
passport.use(new GoogleStrategy(
  {
    clientID: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    callbackURL: `${config.BASE_URL}/auth/google/callback`,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find user by Google ID
      let user = await User.findOne({
        providerId: profile.id,
        authProvider: 'google',
      });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await User.findOne({ email: email });
        if (user) {
          // Update existing user with Google auth
          user.authProvider = 'google';
          user.providerId = profile.id;
          await user.save();
          return done(null, user);
        }
      }

      // Create new user
      const username = `user_${profile.id.substring(0, 8)}`;
      const newUser = new User({
        username: username,
        email: email,
        authProvider: 'google',
        providerId: profile.id,
        // No password for OAuth users
      });

      await newUser.save();

      // Create default data for new user
      await ChecklistData.getUserData(username);

      done(null, newUser);
    } catch (error) {
      console.error('Google OAuth error:', error);
      done(error);
    }
  }
));

/**
 * GitHub OAuth Strategy
 */
passport.use(new GitHubStrategy(
  {
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: `${config.BASE_URL}/auth/github/callback`,
    scope: ['user:email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find user by GitHub ID
      let user = await User.findOne({
        providerId: profile.id,
        authProvider: 'github',
      });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      const email = profile.emails?.[0]?.value;
      if (email) {
        user = await User.findOne({ email: email });
        if (user) {
          user.authProvider = 'github';
          user.providerId = profile.id;
          await user.save();
          return done(null, user);
        }
      }

      // Create new user - use GitHub username if available
      const username = profile.username || `github_${profile.id.substring(0, 8)}`;
      const newUser = new User({
        username: username,
        email: email,
        authProvider: 'github',
        providerId: profile.id,
      });

      await newUser.save();

      // Create default data for new user
      await ChecklistData.getUserData(username);

      done(null, newUser);
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      done(error);
    }
  }
));

export default passport;