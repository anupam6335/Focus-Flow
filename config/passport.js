/**
 * Passport Configuration
 * OAuth strategies and authentication setup
 */

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import ChecklistData from "../models/ChecklistData.js";
import config from "./environment.js";

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
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: `${config.BASE_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find user by Google ID
        let user = await User.findOne({
          providerId: profile.id,
          authProvider: "google",
        });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            // Update existing user with Google auth
            user.authProvider = "google";
            user.providerId = profile.id;
            user.avatar = profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user with unique username
        const baseUsername =
          profile.displayName?.replace(/\s+/g, "_").toLowerCase() || "user";
        let username = baseUsername;
        let counter = 1;

        // Ensure username is unique
        while (await User.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        const newUser = new User({
          username: username,
          email: email?.toLowerCase(),
          authProvider: "google",
          providerId: profile.id,
          avatar: profile.photos?.[0]?.value,
          password: "oauth-user-no-password",
        });

        await newUser.save();

        // Create default data for new user
        await ChecklistData.getUserData(username);

        done(null, newUser);
      } catch (error) {
        console.error("Google OAuth error:", error);
        done(error);
      }
    }
  )
);

/**
 * GitHub OAuth Strategy
 */
passport.use(
  new GitHubStrategy(
    {
      clientID: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      callbackURL: `${config.BASE_URL}/api/auth/github/callback`,
      scope: ["user:email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find user by GitHub ID
        let user = await User.findOne({
          providerId: profile.id,
          authProvider: "github",
        });

        if (user) {
          return done(null, user);
        }

        // Check if user exists with same email
        const email = profile.emails?.[0]?.value;
        if (email) {
          user = await User.findOne({ email: email.toLowerCase() });
          if (user) {
            user.authProvider = "github";
            user.providerId = profile.id;
            user.avatar = profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }
        }

        // Create new user - use GitHub username if available
        let username =
          profile.username || `github_${profile.id.substring(0, 8)}`;
        let counter = 1;
        const originalUsername = username;

        // Ensure username is unique
        while (await User.findOne({ username })) {
          username = `${originalUsername}${counter}`;
          counter++;
        }

        const newUser = new User({
          username: username,
          email: email?.toLowerCase(),
          authProvider: "github",
          providerId: profile.id,
          avatar: profile.photos?.[0]?.value,
          password: "oauth-user-no-password",
        });

        await newUser.save();

        // Create default data for new user
        await ChecklistData.getUserData(username);

        done(null, newUser);
      } catch (error) {
        console.error("GitHub OAuth error:", error);
        done(error);
      }
    }
  )
);

export default passport;
