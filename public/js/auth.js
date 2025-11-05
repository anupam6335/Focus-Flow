/**
 * FocusFlow — Quiet Auth (Forest Library Edition)
 * app.js orchestrates all interactions with a calm, minimal motion system.
 * The backend endpoints are already live; this file only handles UX flow.
 *
 * GLOBAL NOTE:
 * - All functions include top docs (what/where/IO).
 * - Network calls go through fx() for consistent handling.
 * - Animations are fade/slide/scale only—no flashing or color pulsing.
 * - New UX features are additive and frontend-only; no API changes.
 */

const API = "/api/auth";
const TIMEOUT = 15000;
const $ = (id) => document.getElementById(id);

/* --------------------------------------------------------------------------
   Element Cache — single-pass lookups for performance.
   -------------------------------------------------------------------------- */
const sheet = $("sheet");
const chipMode = $("chipMode");
const story = $("story");
const stepCue = $("stepCue");
const helper = $("helper");
const statusEl = $("status");
const form = $("form"),
  submitBtn = $("submit"),
  submitText = $("submitText");

/* Screen groups */
const groupLogin = $("groupLogin");
const groupRegister = $("groupRegister");
const groupForgot = $("groupForgot");
const groupOTP = $("groupOTP");
const groupReset = $("groupReset");

/* Inputs */
const identifier = $("identifier");
const password = $("password");
const username = $("username");
const email = $("email");
const passwordReg = $("passwordReg");
const confirmPassword = $("confirmPassword");
const emailForgot = $("emailForgot");
const emailOTP = $("emailOTP");
const otp = $("otp");
const newPassword = $("newPassword");
const confirmNewPassword = $("confirmNewPassword");

/* Helpers */
const unameNote = $("unameNote");
const emailNote = $("emailNote");

/* Strength blocks */
const strengthLogin = {
  $wrap: $("strengthLogin"),
  dots: null,
  emoji: $("emojiLogin"),
  text: $("textLogin"),
};
const strengthReg = {
  $wrap: $("strengthReg"),
  dots: null,
  emoji: $("emojiReg"),
  text: $("textReg"),
};
const strengthReset = {
  $wrap: $("strengthReset"),
  dots: null,
  emoji: $("emojiReset"),
  text: $("textReset"),
};

/* Match chips */
const matchReg = $("matchReg"),
  matchRegText = $("matchRegText");
const matchReset = $("matchReset"),
  matchResetText = $("matchResetText");

/* Caps Lock chips */
const capsLogin = $("capsLogin");
const capsReg = $("capsReg");
const capsReset = $("capsReset");

/* Buttons / toggles */
const tLogin = $("tLogin"),
  tRegister = $("tRegister"),
  linkRegister = $("linkRegister"),
  linkForgot = $("linkForgot");
const btnCheck = $("btnCheck"),
  btnAuto = $("btnAuto");
const eyePass = $("eyePass"),
  eyePassReg = $("eyePassReg"),
  eyeConfirm = $("eyeConfirm"),
  eyeNew = $("eyeNew"),
  eyeConfirmNew = $("eyeConfirmNew");

/* OAuth buttons */
const btnOAuthGoogle = $("btnOAuthGoogle");
const btnOAuthGitHub = $("btnOAuthGitHub");

/* OTP reveal cluster */
const otpReveal = $("otpReveal"),
  otpValue = $("otpValue"),
  copyOtp = $("copyOtp"),
  hideOtp = $("hideOtp");

/* State */
let mode = "login",
  busy = false,
  fadeTimer = null,
  lastOtp = null,
  noteTimerU = null,
  lastUCopy = "";
let debounceEmailTimer = null;

/* --------------------------------------------------------------------------
   Utility: Query param cleanup for OAuth callback noise.
   What:   Remove ?code=, ?state=, etc. to present a clean URL after redirects.
   Where:  On page load (auth.html), harmless if not present.
   I/O:    none
   -------------------------------------------------------------------------- */
(function cleanQueryParams() {
  try {
    const u = new URL(location.href);
    const dirtyKeys = ["code", "state", "scope", "auth_error"];
    let changed = false;
    dirtyKeys.forEach((k) => {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (changed)
      history.replaceState(
        {},
        "",
        u.pathname +
          (u.searchParams.toString() ? "?" + u.searchParams.toString() : "")
      );
  } catch {}
})();

/* --------------------------------------------------------------------------
   dotRefs(block)
   -------------------------------------------------------------------------- */
function dotRefs(block) {
  if (!block.$wrap) return null;
  if (!block.dots) {
    block.dots = Array.from(block.$wrap.querySelectorAll(".dot"));
  }
  return block.dots;
}

/* --------------------------------------------------------------------------
   showMsg(text, ok)
   What:   Display a single-shot status message that auto-fades out.
           Adds gentle micro-shake on errors and inserts “try another way”.
   -------------------------------------------------------------------------- */
function showMsg(text, ok = false, opts = {}) {
  clearTimeout(fadeTimer);
  const friendly = mapErrorToFriendly(text);
  const extra =
    !ok && mode === "login"
      ? ` <span class="inline-alt">Try <span class="link" id="inlineForgot">reset</span> or use <span class="link" id="inlineGoogle">Google</span>/<span class="link" id="inlineGitHub">GitHub</span>.</span>`
      : "";
  statusEl.innerHTML = `<div class="feedback ${
    ok ? "ok" : "err"
  }" id="fx">${escapeHtml(friendly)}${extra}</div>`;
  if (!ok) {
    sheet.classList.add("shake");
    setTimeout(() => sheet.classList.remove("shake"), 260);
  }
  const fx = $("fx");
  if (fx) {
    $("inlineForgot") && ($("inlineForgot").onclick = () => setMode("forgot"));
    $("inlineGoogle") &&
      ($("inlineGoogle").onclick = () => btnOAuthGoogle.click());
    $("inlineGitHub") &&
      ($("inlineGitHub").onclick = () => btnOAuthGitHub.click());
  }
  fadeTimer = setTimeout(
    () => {
      const fx2 = $("fx");
      if (fx2) {
        fx2.classList.add("fade");
        setTimeout(() => (statusEl.innerHTML = ""), 350);
      }
    },
    opts.sticky ? 8000 : 5000
  );
}

/* --------------------------------------------------------------------------
   mapErrorToFriendly
   PURPOSE: Convert backend or technical errors to friendly copy.
   -------------------------------------------------------------------------- */
function mapErrorToFriendly(msg = "") {
  const t = (msg || "").toLowerCase();
  if (t.includes("invalid username/email or password"))
    return "That didn’t work. Please check your username/email and password.";
  if (t.includes("passwords do not match"))
    return "The two passwords don’t match.";
  if (t.includes("email already registered"))
    return "This email is already registered. Try Sign in or reset.";
  if (
    t.includes("username already exists") ||
    t.includes("username already taken")
  )
    return "That username is taken.";
  if (t.includes("use google") || t.includes("use github")) return msg; // show provider name as-is
  if (t.includes("network timeout"))
    return "Network is slow. Please try again.";
  if (t.includes("network error"))
    return "No internet? Please check your connection.";
  return msg;
}

/* --------------------------------------------------------------------------
   fx(url, opts, timeout)
   -------------------------------------------------------------------------- */
async function fx(url, opts = {}, timeout = TIMEOUT) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, {
      ...opts,
      credentials: "include",
      signal: ctl.signal,
    });
    clearTimeout(id);
    const t = await r.text();
    let data = null;
    try {
      data = t ? JSON.parse(t) : null;
    } catch {
      data = { success: false, error: "Invalid server response" };
    }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    clearTimeout(id);
    throw new Error(
      e.name === "AbortError"
        ? "Network timeout. Try again."
        : "Network error. Check connection."
    );
  }
}

/* --------------------------------------------------------------------------
   setMode(name)
   What:   Switch UI state, update copy/step cue, button text, and focus.
   -------------------------------------------------------------------------- */
function setMode(name) {
  mode = name;
  chipMode.textContent = {
    login: "Sign in",
    register: "Create account",
    forgot: "Forgot password",
    otp: "Enter code",
    reset: "Reset password",
  }[name];

  groupLogin.hidden = name !== "login";
  groupRegister.hidden = name !== "register";
  groupForgot.hidden = name !== "forgot";
  groupOTP.hidden = name !== "otp";
  groupReset.hidden = name !== "reset";

  const stepMap = {
    login: "(Step 1 of 3)",
    otp: "(Step 2 of 3)",
    reset: "(Step 3 of 3)",
  };
  stepCue.textContent = stepMap[name] || "";

  const storyMap = {
    login: [
      "<strong>Guide:</strong> The gate is already open. Just say who you are.",
      'One calm step and we’re back on the path. <span class="step">(Step 1 of 3)</span>',
    ],
    register: [
      "<strong>Guide:</strong> Choose a name like you’re naming a hero in a quiet legend.",
      "No rush. Even mountains start as gentle hills.",
    ],
    forgot: [
      "<strong>Guide:</strong> Happens to the best travelers.",
      "Tell us where to send the secret key. No shame. No noise.",
    ],
    otp: [
      "<strong>Guide:</strong> A tiny code with a big purpose.",
      'This is the little knock before the door opens. <span class="step">(Step 2 of 3)</span>',
    ],
    reset: [
      "<strong>Guide:</strong> Time for a new key—strong but memorable.",
      'Fit it to your hand. You’ll use it again. <span class="step">(Step 3 of 3)</span>',
    ],
  };

  story.innerHTML = `
    <p>${storyMap[name][0]}</p>
    <p>${storyMap[name][1]}</p>
    <div class="mini-tabs">
      <button class="t ${
        name === "login" ? "primary" : ""
      }" id="tLogin2">Sign in</button>
      <button class="t ${
        name === "register" ? "primary" : ""
      }" id="tRegister2">Create account</button>
    </div>
  `;
  document.getElementById("tLogin2").onclick = () => setMode("login");
  document.getElementById("tRegister2").onclick = () => setMode("register");

  helper.textContent = {
    login:
      "If this email was made with Google or GitHub, use the buttons above.",
    register: "Pick a username and a steady key.",
    forgot:
      "If this account uses Google/GitHub, sign in there — no password needed.",
    otp: "Enter the code we showed or sent.",
    reset: "Set a calm, strong key.",
  }[name];

  submitText.textContent = {
    login: "Sign in",
    register: "Create account",
    forgot: "Request code",
    otp: "Verify code",
    reset: "Reset password",
  }[name];

  /* subtle fade/slide entry */
  sheet.style.animation = "none";
  sheet.offsetHeight;
  sheet.style.animation = "fadeIn var(--d-fade) var(--ease) both";

  /* Show login strength only on login */
  strengthLogin.$wrap.hidden = name !== "login";

  /* Accessibility: move focus to first relevant field */
  focusFirstField(name);
}

/* --------------------------------------------------------------------------
   escapeHtml(s)
   -------------------------------------------------------------------------- */
function escapeHtml(s) {
  return s == null
    ? ""
    : String(s).replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }[m])
      );
}

/* --------------------------------------------------------------------------
   toggleEye(btn, input)  (UNCHANGED — required)
   -------------------------------------------------------------------------- */
function toggleEye(btn, input) {
  const hidden = input.type === "password";
  input.type = hidden ? "text" : "password";
  btn.dataset.state = hidden ? "visible" : "hidden";
  btn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
}

/* --------------------------------------------------------------------------
   strengthScore(pw)
   -------------------------------------------------------------------------- */
function strengthScore(pw) {
  let score = 0;
  if (!pw)
    return {
      score,
      label: "weak",
      quip: "This password is so weak it needs a nap 💤",
    };
  const len = pw.length >= 12 ? 2 : pw.length >= 8 ? 1 : 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].reduce(
    (n, re) => n + (re.test(pw) ? 1 : 0),
    0
  );
  score = Math.min(3, len + (variety >= 3 ? 2 : variety >= 2 ? 1 : 0));
  if (score <= 1)
    return { score: 1, label: "weak", quip: "Maybe give it some protein? 💪" };
  if (score === 2)
    return {
      score: 2,
      label: "medium",
      quip: "Getting there — a few spices more 🌶️",
    };
  return {
    score: 3,
    label: "strong",
    quip: "Balanced and ready — like a calm ninja 🥷",
  };
}

/* --------------------------------------------------------------------------
   paintStrength(block, pw)
   -------------------------------------------------------------------------- */
function paintStrength(block, pw) {
  if (!block.$wrap) return;
  const dots = dotRefs(block);
  const { score, label, quip } = strengthScore(pw);
  dots.forEach((d, i) => d.classList.toggle("on", i < score));
  block.text.textContent = `${label.toUpperCase()}. ${quip}`;
  block.emoji.textContent = score >= 3 ? "🍵" : score === 2 ? "🌿" : "🫧";
}

/* --------------------------------------------------------------------------
   showUnameNote(text, type)
   -------------------------------------------------------------------------- */
function showUnameNote(text, type) {
  if (text === lastUCopy) return;
  lastUCopy = text;
  unameNote.textContent = text;
  unameNote.style.color = type === "ok" ? "#E9E9E9" : "#ffdede";
  clearTimeout(noteTimerU);
  noteTimerU = setTimeout(() => {
    unameNote.textContent = "";
    lastUCopy = "";
  }, 5000);
}

/* --------------------------------------------------------------------------
   checkUsernameAvailability(name)
   -------------------------------------------------------------------------- */
async function checkUsernameAvailability(name) {
  const n = (name || "").toLowerCase().trim();
  if (n.length < 3) {
    btnAuto.style.display = "none";
    showUnameNote("Username must be at least 3 characters.", "err");
    return false;
  }
  const r = await fx(`/api/auth/check-username/${encodeURIComponent(n)}`);
  if (!r.ok) {
    btnAuto.style.display = "none";
    showUnameNote(
      r.data?.message || `Could not check username (${r.status}).`,
      "err"
    );
    return false;
  }
  if (r.data.available) {
    btnAuto.style.display = "none";
    showUnameNote("Username is available.", "ok");
    pulseValid(username);
    return true;
  }
  btnAuto.style.display = "inline-block";
  showUnameNote("Username is taken. Use Auto to pick one.", "err");
  return false;
}

/* --------------------------------------------------------------------------
   autoGenerateUsername()
   -------------------------------------------------------------------------- */
async function autoGenerateUsername() {
  const base =
    (username.value || "focus")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 15) || "flow";
  const tags = [
    "spark",
    "flow",
    "stride",
    "zen",
    "pulse",
    "craft",
    "swift",
    "calm",
    "shoji",
    "kintsugi",
    "dawn",
    "loom",
    "peak",
    "trail",
    "prime",
    "beam",
  ];
  const picks = [
    `${base}${Math.floor(Math.random() * 900 + 100)}`,
    `${base}_${tags[Math.floor(Math.random() * tags.length)]}`,
    `${tags[Math.floor(Math.random() * tags.length)]}_${base}`,
    `${base}${new Date().getFullYear() % 100}`,
    `${base}${Math.floor(Math.random() * 99 + 1)}`,
  ];
  for (const c of picks) {
    if (await checkUsernameAvailability(c)) {
      username.value = c;
      btnAuto.style.display = "none";
      showUnameNote("Auto-generated username selected.", "ok");
      pulseValid(username);
      return;
    }
  }
  for (let i = 0; i < 10; i++) {
    const c = `${base}${Math.floor(Math.random() * 9999)}`;
    if (await checkUsernameAvailability(c)) {
      username.value = c;
      btnAuto.style.display = "none";
      showUnameNote("Auto-generated username selected.", "ok");
      pulseValid(username);
      return;
    }
  }
  showUnameNote("Could not find one now. Try another base.", "err");
}

/* --------------------------------------------------------------------------
   instantEmailCheck(value)
   PURPOSE: Immediate POST /check-email with debounce.
   -------------------------------------------------------------------------- */
async function instantEmailCheck(value) {
  const v = (value || "").trim();
  if (!v) {
    emailNote.textContent = "";
    return;
  }
  if (debounceEmailTimer) clearTimeout(debounceEmailTimer);
  debounceEmailTimer = setTimeout(async () => {
    const r = await fx(`/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: v }),
    });
    if (!r.ok) {
      emailNote.textContent = "Could not validate email right now.";
      emailNote.style.color = "#ffdede";
      return;
    }
    if (!r.data.available) {
      emailNote.textContent =
        "This email is already in use. Try a different one.";
      emailNote.style.color = "#ffdede";
    } else {
      emailNote.textContent = "Email is available.";
      emailNote.style.color = "#E9E9E9";
      pulseValid(email);
    }
  }, 300);
}

/* --------------------------------------------------------------------------
   requestForgot(v)
   -------------------------------------------------------------------------- */
async function requestForgot(v) {
  // First check the auth provider for this email
  try {
    const authProviderCheck = await fx(`${API}/get-auth-provider`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: v }),
    });

    // Handle case where email doesn't exist
    if (
      authProviderCheck.ok &&
      authProviderCheck.data &&
      authProviderCheck.data.authProvider == null
    ) {
      showMsg(`This Email ID doesn't exist.`, false, {
        sticky: true,
        duration: 15000, // Show for 15 seconds
      });

      // Add links for registration and Google
      setTimeout(() => {
        const fx = $("fx");
        if (fx) {
          const extraHtml = ` <span class="inline-alt">You can <span class="link" id="registerLinkForgot">register with this email</span> or use <span class="link" id="googleLinkForgot">Google</span> if you have this account.</span>`;
          fx.innerHTML += extraHtml;

          // Add click handlers
          const registerLink = document.getElementById("registerLinkForgot");
          const googleLink = document.getElementById("googleLinkForgot");

          if (registerLink) {
            registerLink.onclick = () => setMode("register");
          }
          if (googleLink) {
            googleLink.onclick = () => btnOAuthGoogle.click();
          }
        }
      }, 100);

      return;
    }

    if (
      authProviderCheck.ok &&
      authProviderCheck.data &&
      (authProviderCheck.data.authProvider === "google" ||
        authProviderCheck.data.authProvider === "github")
    ) {
      const provider = authProviderCheck.data.authProvider;
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

      // Use the EXACT same approach as login errors
      showMsg(
        `This account uses ${providerName} login. No reset code is needed.`,
        false,
        {
          sticky: true,
          duration: 15000, // Show for 15 seconds
        }
      );

      // Manually add the extra HTML with links (same as login mode)
      setTimeout(() => {
        const fx = $("fx");
        if (fx) {
          const extraHtml = ` <span class="inline-alt">Click <span class="link" id="oauthLinkForgot">here to sign in with ${providerName}</span>.</span>`;
          fx.innerHTML += extraHtml;

          // Add click handler
          const oauthLink = document.getElementById("oauthLinkForgot");
          if (oauthLink) {
            oauthLink.onclick = () => {
              if (provider === "google") {
                btnOAuthGoogle.click();
              } else if (provider === "github") {
                btnOAuthGitHub.click();
              }
            };
          }
        }
      }, 100);

      return; // STOP - don't proceed to OTP
    }
  } catch (err) {
    // If we can't check auth provider, continue with normal flow
  }

  const r = await fx(`${API}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: v }),
  });
  if (!r.ok) {
    showMsg(r.data?.error || `Request failed (${r.status}).`, false);
    return;
  }
  showMsg("If registered, a calm reset code was sent.", true);
  lastOtp = r.data?.otp || null;
  emailOTP.value = v;
  if (lastOtp) {
    otpValue.textContent = lastOtp;
    otpReveal.style.display = "flex";
  }
  setMode("otp");
}

/* --------------------------------------------------------------------------
   verifyOtp(vEmail, vCode)
   -------------------------------------------------------------------------- */
async function verifyOtp(vEmail, vCode) {
  const r = await fx(`${API}/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: vEmail, otp: vCode }),
  });
  if (!r.ok) {
    showMsg(r.data?.error || `OTP verification failed (${r.status}).`, false);
    return false;
  }
  showMsg("Code verified — almost there.", true);
  setMode("reset");
  return true;
}

/* --------------------------------------------------------------------------
   submitHandler(e)
   Master submit gate; routes by current mode. Adds loading state.
   -------------------------------------------------------------------------- */
async function submitHandler(e) {
  e.preventDefault();
  if (busy) return;
  busy = true;
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  showMsg("Processing…", true);
  try {
    if (mode === "login") {
      if (!identifier.value.trim() || !password.value)
        throw new Error("Enter username/email and password.");
      const r = await fx(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.value.trim(),
          password: password.value,
        }),
      });
      if (!r.ok) {
        return showMsg(
          r.data?.authProvider
            ? `This account uses ${r.data.authProvider} login. Please continue with ${r.data.authProvider} above.`
            : r.data?.error || `Login failed (${r.status}).`,
          false,
          { sticky: true }
        );
      }
      if (r.data?.token) {
        const d = new Date();
        d.setTime(d.getTime() + 7 * 864e5);
        document.cookie = `ff_token=${encodeURIComponent(
          r.data.token
        )}; path=/; expires=${d.toUTCString()}; samesite=strict`;
        try {
          localStorage.setItem("ff_last_id", identifier.value.trim());
        } catch {}
      }
      showMsg("Welcome back. Gentle step — strong day. Redirecting…", true);
      setTimeout(() => (location.href = "/"), 650);
    }

    if (mode === "register") {
      if (
        !username.value.trim() ||
        !email.value.trim() ||
        !passwordReg.value ||
        !confirmPassword.value
      )
        throw new Error("Complete all fields.");
      if (passwordReg.value !== confirmPassword.value)
        throw new Error("Passwords do not match.");
      const r = await fx(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.value.trim(),
          email: email.value.trim(),
          password: passwordReg.value,
        }),
      });
      if (!r.ok) {
        return showMsg(
          r.data?.error || `Registration failed (${r.status}).`,
          false
        );
      }
      showMsg("Account created. Breathe in — let’s begin.", true);
      identifier.value = username.value.trim();
      pulseValid(username);
      pulseValid(email);
      setMode("login");
    }

    if (mode === "forgot") {
      const v = emailForgot.value.trim();
      if (!v) throw new Error("Enter your email.");
      // Probe OAuth-only hint
      const probe = await fx(`${API}/validate-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: v, password: "_probe_" }),
      });
      if (probe.ok && probe.data && probe.data.authProvider) {
        const p = probe.data.authProvider;
        return showMsg(
          `This account uses ${p} login. No password needed — continue with ${p} above.`,
          false
        );
      }
      await requestForgot(v);
    }

    if (mode === "otp") {
      const vEmail = emailOTP.value.trim(),
        vCode = otp.value.trim();
      if (!vEmail || !vCode) throw new Error("Enter email and code.");
      await verifyOtp(vEmail, vCode);
    }

    if (mode === "reset") {
      const vEmail = emailOTP.value.trim() || emailForgot.value.trim() || "";
      if (!vEmail || !newPassword.value || !confirmNewPassword.value)
        throw new Error(
          "Enter email (previous step), new password, and confirm."
        );
      if (newPassword.value !== confirmNewPassword.value)
        throw new Error("Passwords do not match.");
      const r = await fx(`${API}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: vEmail,
          otp: otp.value.trim(),
          newPassword: newPassword.value,
        }),
      });
      if (!r.ok) {
        return showMsg(r.data?.error || `Reset failed (${r.status}).`, false);
      }
      showMsg("Password updated. Light step forward.", true);
      setMode("login");
    }
  } catch (err) {
    showMsg(err.message || "Unexpected error", false);
  } finally {
    busy = false;
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
}

/* --------------------------------------------------------------------------
   debounce(fn, ms)
   -------------------------------------------------------------------------- */
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* --------------------------------------------------------------------------
   Keyboard-first flow
   - Enter submits (native).
   - Esc clears banner and blurs input.
   - Logical Tab order is native; ensure links are next in DOM.
   -------------------------------------------------------------------------- */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    statusEl.innerHTML = "";
    if (document.activeElement && document.activeElement.blur)
      document.activeElement.blur();
  }
});

/* --------------------------------------------------------------------------
   Focus-aware helper: updates helper text based on focused field
   -------------------------------------------------------------------------- */
const helperMap = {
  identifier: "Tip: You can use your username or email.",
  password: "Keep it private. Use reset if stuck.",
  username: "3–30 lowercase letters or numbers.",
  email: "We only use this to sign you in.",
  passwordReg: "Use at least 8 characters with variety.",
  confirmPassword: "Must match the password above.",
  emailForgot: "We’ll send or show a reset code.",
  otp: "Paste your 4-digit code if you have it.",
  newPassword: "Set a calm, strong key.",
  confirmNewPassword: "Must match the new password.",
};
function attachHelperFocus(el, id) {
  if (!el) return;
  el.addEventListener("focus", () => {
    helper.textContent = helperMap[id] || helper.textContent;
  });
  el.addEventListener("blur", () => {
    /* Keep last message; quiet UI */
  });
}
[
  "identifier",
  "password",
  "username",
  "email",
  "passwordReg",
  "confirmPassword",
  "emailForgot",
  "otp",
  "newPassword",
  "confirmNewPassword",
].forEach((id) => attachHelperFocus($(id), id));

/* --------------------------------------------------------------------------
   Caps Lock detection for password fields
   -------------------------------------------------------------------------- */
function capsDetector(e, chip) {
  if (!chip) return;
  const caps = e.getModifierState && e.getModifierState("CapsLock");
  chip.hidden = !caps;
}
password &&
  password.addEventListener("keyup", (e) => capsDetector(e, capsLogin));
passwordReg &&
  passwordReg.addEventListener("keyup", (e) => capsDetector(e, capsReg));
newPassword &&
  newPassword.addEventListener("keyup", (e) => capsDetector(e, capsReset));

/* --------------------------------------------------------------------------
   Password match chips (register & reset)
   -------------------------------------------------------------------------- */
function updateMatch(pw, conf, el, textEl) {
  if (!el || !textEl) return;
  if (!conf.value) {
    el.classList.remove("ok", "bad");
    textEl.textContent = "";
    return;
  }
  if (pw.value && pw.value === conf.value) {
    el.classList.add("ok");
    el.classList.remove("bad");
    textEl.textContent = "Match ✓";
    pulseValid(conf);
  } else {
    el.classList.add("bad");
    el.classList.remove("ok");
    textEl.textContent = "Doesn’t match";
  }
}
confirmPassword &&
  confirmPassword.addEventListener("input", () =>
    updateMatch(passwordReg, confirmPassword, matchReg, matchRegText)
  );
passwordReg &&
  passwordReg.addEventListener("input", () =>
    updateMatch(passwordReg, confirmPassword, matchReg, matchRegText)
  );
confirmNewPassword &&
  confirmNewPassword.addEventListener("input", () =>
    updateMatch(newPassword, confirmNewPassword, matchReset, matchResetText)
  );
newPassword &&
  newPassword.addEventListener("input", () =>
    updateMatch(newPassword, confirmNewPassword, matchReset, matchResetText)
  );

/* --------------------------------------------------------------------------
   Tiny completion glow
   -------------------------------------------------------------------------- */
function pulseValid(input) {
  if (!input) return;
  input.classList.add("valid-soft");
  setTimeout(() => input.classList.remove("valid-soft"), 800);
}

/* --------------------------------------------------------------------------
   Inline basic validation on blur (email format, required, username length)
   -------------------------------------------------------------------------- */
function isEmailLike(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
username &&
  username.addEventListener("blur", () => {
    const v = username.value.trim();
    if (v.length >= 3) pulseValid(username);
  });
email &&
  email.addEventListener("blur", () => {
    const v = email.value.trim();
    if (isEmailLike(v)) pulseValid(email);
  });

/* --------------------------------------------------------------------------
   OAuth loading state — disable other provider to prevent double clicks
   -------------------------------------------------------------------------- */
// OAuth button handlers
btnOAuthGoogle.addEventListener("click", (e) => {
  e.preventDefault();
  oauthLoading(btnOAuthGoogle, btnOAuthGitHub);
  // Direct navigation to OAuth endpoint
  window.location.href = "/api/auth/google";
});

btnOAuthGitHub.addEventListener("click", (e) => {
  e.preventDefault();
  oauthLoading(btnOAuthGitHub, btnOAuthGoogle);
  // Direct navigation to OAuth endpoint
  window.location.href = "/api/auth/github";
});

// Enhanced OAuth loading function
function oauthLoading(btn, otherBtn) {
  btn.classList.add("loading");
  btn.setAttribute("aria-disabled", "true");
  otherBtn.setAttribute("aria-disabled", "true");

  // Re-enable buttons after 5 seconds in case of failure
  setTimeout(() => {
    btn.classList.remove("loading");
    btn.removeAttribute("aria-disabled");
    otherBtn.removeAttribute("aria-disabled");
  }, 5000);
}

/* --------------------------------------------------------------------------
   OTP paste support — clean to digits and truncate to maxlength
   -------------------------------------------------------------------------- */
otp &&
  otp.addEventListener("paste", (e) => {
    const t = (e.clipboardData?.getData("text") || "")
      .replace(/\D+/g, "")
      .slice(0, 6);
    if (t) {
      e.preventDefault();
      otp.value = t;
    }
  });

/* --------------------------------------------------------------------------
   Eye toggles (UNCHANGED)
   -------------------------------------------------------------------------- */
eyePass.onclick = () => toggleEye(eyePass, password);
eyePassReg.onclick = () => toggleEye(eyePassReg, passwordReg);
eyeConfirm.onclick = () => toggleEye(eyeConfirm, confirmPassword);
eyeNew.onclick = () => toggleEye(eyeNew, newPassword);
eyeConfirmNew.onclick = () => toggleEye(eyeConfirmNew, confirmNewPassword);

/* --------------------------------------------------------------------------
   Username check/autogen, email check, strength paints
   -------------------------------------------------------------------------- */
btnCheck.onclick = () => checkUsernameAvailability(username.value);
if (username) {
  const debouncedUserCheck = debounce(
    () => checkUsernameAvailability(username.value),
    320
  );
  username.addEventListener("input", () => {
    btnAuto.style.display = "none";
    debouncedUserCheck();
  });
}
btnAuto.onclick = autoGenerateUsername;
if (email)
  email.addEventListener("input", (e) => instantEmailCheck(e.target.value));
if (passwordReg)
  passwordReg.addEventListener("input", () =>
    paintStrength(strengthReg, passwordReg.value)
  );

passwordReg.addEventListener("input", () =>
  paintStrength(strengthReg, passwordReg.value)
);
newPassword.addEventListener("input", () =>
  paintStrength(strengthReset, newPassword.value)
);

/* --------------------------------------------------------------------------
   Copy/Hide OTP helpers
   -------------------------------------------------------------------------- */
copyOtp.onclick = () => {
  if (!lastOtp) return showMsg("No code to copy");
  navigator.clipboard
    ?.writeText(lastOtp)
    .then(() => showMsg("Code copied", true))
    .catch(() => showMsg("Copy failed"));
};
hideOtp.onclick = () => {
  lastOtp = null;
  otpReveal.style.display = "none";
  showMsg("Code hidden", true);
};

/* --------------------------------------------------------------------------
   Links + Tabs
   -------------------------------------------------------------------------- */
document.getElementById("tLogin").onclick = () => setMode("login");
document.getElementById("tRegister").onclick = () => setMode("register");
linkRegister.onclick = () => setMode("register");
linkForgot.onclick = () => setMode("forgot");

/* --------------------------------------------------------------------------
   Form submit
   -------------------------------------------------------------------------- */
form.addEventListener("submit", submitHandler);

/* --------------------------------------------------------------------------
   Focus management
   -------------------------------------------------------------------------- */
function focusFirstField(currentMode) {
  const map = {
    login: identifier,
    register: username,
    forgot: emailForgot,
    otp: otp,
    reset: newPassword,
  };
  const el = map[currentMode];
  if (el) {
    el.focus();
    el.select && el.select();
  }
}

/* --------------------------------------------------------------------------
   Prefill last used identifier from localStorage for comfort
   -------------------------------------------------------------------------- */
(function prefillIdentifier() {
  try {
    const last = localStorage.getItem("ff_last_id");
    if (last && identifier) {
      identifier.value = last;
      identifier.select();
    }
  } catch {}
})();

/* --------------------------------------------------------------------------
   Init
   -------------------------------------------------------------------------- */
function initAutofocus() {
  if (identifier) {
    identifier.focus();
    identifier.select();
  }
}
setMode("login");
dotRefs(strengthLogin);
dotRefs(strengthReg);
dotRefs(strengthReset);
initAutofocus();
