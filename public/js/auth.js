/**
 * FocusFlow — Quiet Auth (Forest Library Edition)
 * Page logic only. Shared utilities live in js/helper.js.
 */

const API = "/api/auth";
// const $ = window.Helper ? window.Helper.$ : (id) => document.getElementById(id);

/* Element Cache */
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

/* Caps */
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

/* OAuth */
const btnOAuthGoogle = $("btnOAuthGoogle");
const btnOAuthGitHub = $("btnOAuthGitHub");

/* OTP reveal */
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
let verifiedEmail = "";
let lastEmailChecked = "";
let lastEmailResult = "";

const EMAIL_PROVIDERS = [
  "gmail",
  "yahoo",
  "outlook",
  "hotmail",
  "live",
  "icloud",
  "proton",
  "protonmail",
  "gmx",
  "yandex",
  "aol",
  "zoho",
  "fastmail",
  "tutanota",
  "msn",
  "hey",
  "pmme",
];
const USERNAME_RE = /^[a-z0-9]{3,30}$/; // a–z, 0–9, 3–30

function hasProviderToken(s) {
  const v = (s || "").toLowerCase();
  return EMAIL_PROVIDERS.some((p) => v.includes(p));
}

function validateUsernameStrict(raw) {
  const n = (raw || "").toLowerCase().trim();
  if (!n) return { ok: false, msg: "Enter a username." };
  if (/@/.test(n))
    return {
      ok: false,
      msg: "Usernames can’t be emails. Use letters and numbers only.",
    };

  const s = n.replace(/[^a-z0-9]/g, "");
  if (s !== n) return { ok: false, msg: "Use only a–z and 0–9." };
  if (s.length < 3 || s.length > 30)
    return { ok: false, msg: "3–30 characters only." };
  if (hasProviderToken(s))
    return {
      ok: false,
      msg: "Don’t include email providers (gmail, outlook, yahoo).",
    };
  if (!USERNAME_RE.test(s)) return { ok: false, msg: "Use only a–z and 0–9." };
  return { ok: true, value: s };
}

/* Clean OAuth query params */
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

/* Friendly error mapper */
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
  if (t.includes("use google") || t.includes("use github")) return msg;
  if (t.includes("network timeout"))
    return "Network is slow. Please try again.";
  if (t.includes("network error"))
    return "No internet? Please check your connection.";
  return msg;
}

/* Status banner */
function showMsg(text, ok = false, opts = {}) {
  clearTimeout(fadeTimer);
  const friendly = mapErrorToFriendly(text);
  const extra =
    !ok && mode === "login"
      ? ` <span class="inline-alt">Try <span class="link" id="inlineForgot">reset</span> or use <span class="link" id="inlineGoogle">Google</span>/<span class="link" id="inlineGitHub">GitHub</span>.</span>`
      : "";
  statusEl.innerHTML = `<div class="feedback ${
    ok ? "ok" : "err"
  }" id="fx">${Helper.escapeHtml(friendly)}${extra}</div>`;
  if (!ok) {
    sheet.classList.add("shake");
    setTimeout(() => sheet.classList.remove("shake"), 260);
  }
  const fxEl = $("fx");
  if (fxEl) {
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

/* Mode switcher (unchanged behavior) */
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
    </div>`;
  $("tLogin2").onclick = () => setMode("login");
  $("tRegister2").onclick = () => setMode("register");

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

  sheet.style.animation = "none";
  sheet.offsetHeight;
  sheet.style.animation = "fadeIn var(--d-fade) var(--ease) both";
  strengthLogin.$wrap.hidden = name !== "login";
  focusFirstField(name);
}

/* Username helper notes */
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

/* Availability check */
async function checkUsernameAvailability(name) {
  const raw = name || "";
  const sanitized = raw.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (username && sanitized !== raw) username.value = sanitized;

  if (sanitized.length < 3) {
    btnAuto.style.display = "none";
    showUnameNote("Min 3 chars. Letters/numbers only.", "err");
    return false;
  }
  if (!USERNAME_RE.test(sanitized)) {
    btnAuto.style.display = "none";
    showUnameNote("Use only a–z and 0–9 (no @).", "err");
    return false;
  }
  if (hasProviderToken(sanitized)) {
    btnAuto.style.display = "none";
    showUnameNote(
      "Usernames can’t include email providers (e.g., gmail, outlook, yahoo).",
      "err"
    );
    return false;
  }

  const r = await Helper.fx(
    `${API}/check-username/${encodeURIComponent(sanitized)}`
  );
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
    Helper.pulseValid(username);
    return true;
  }

  btnAuto.style.display = "inline-block";
  showUnameNote("Username is taken. Use Auto to pick one.", "err");
  return false;
}

/* Autogen username (unchanged) */
async function autoGenerateUsername() {
  const baseRaw =
    (username.value || "focus")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 15) || "flow";

  // strip provider tokens from the base, just in case
  const base =
    EMAIL_PROVIDERS.reduce(
      (acc, p) => acc.replace(new RegExp(p, "g"), ""),
      baseRaw
    ) || "flow";

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
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = () => tags[rand(tags.length)];

  const make = (s) => s.slice(0, 30);
  const candidates = [
    make(`${base}${100 + rand(900)}`),
    make(`${base}${pick()}`),
    make(`${pick()}${base}`),
    make(`${base}${new Date().getFullYear() % 100}`),
    make(`${base}${1 + rand(99)}`),
  ].filter((c) => c.length >= 3 && !hasProviderToken(c));

  for (const c of candidates) {
    if (await checkUsernameAvailability(c)) {
      username.value = c;
      btnAuto.style.display = "none";
      showUnameNote("Auto-generated username selected.", "ok");
      Helper.pulseValid(username);
      return;
    }
  }
  for (let i = 0; i < 10; i++) {
    const c = make(`${base}${rand(9999)}`);
    if (
      c.length >= 3 &&
      !hasProviderToken(c) &&
      (await checkUsernameAvailability(c))
    ) {
      username.value = c;
      btnAuto.style.display = "none";
      showUnameNote("Auto-generated username selected.", "ok");
      Helper.pulseValid(username);
      return;
    }
  }
  showUnameNote("Could not find one now. Try another base.", "err");
}

/* -------- Login request guard: dedupe + cooldown -------- */
const LoginGuard = (() => {
  let lastAt = 0;
  let cooldownUntil = 0;
  const MIN_GAP = 1200; // min 1.2s between login requests
  const FAIL_COOLDOWN = 2500; // short cooloff after a failure
  const recentFail = new Map(); // sig -> { ts, message, status }
  const inflight = new Map(); // sig -> Promise

  const makeSig = (id, pw) => `${(id || "").trim().toLowerCase()}|${pw || ""}`; // short-lived in-memory signature

  function canSend() {
    const now = Date.now();
    if (now < cooldownUntil) return { ok: false, reason: "cooldown" };
    if (now - lastAt < MIN_GAP) return { ok: false, reason: "gap" };
    return { ok: true };
  }
  function noteSend() {
    lastAt = Date.now();
  }

  function startInflight(sig, p) {
    inflight.set(sig, p);
    p.finally(() => inflight.delete(sig));
    return p;
  }
  function getInflight(sig) {
    return inflight.get(sig) || null;
  }

  function rememberFail(sig, message, status) {
    recentFail.set(sig, { ts: Date.now(), message, status });
    cooldownUntil = Date.now() + FAIL_COOLDOWN;
  }
  function recallFail(sig, ttl = 5000) {
    const hit = recentFail.get(sig);
    if (!hit) return null;
    if (Date.now() - hit.ts > ttl) {
      recentFail.delete(sig);
      return null;
    }
    return hit;
  }

  return {
    makeSig,
    canSend,
    noteSend,
    startInflight,
    getInflight,
    rememberFail,
    recallFail,
  };
})();

async function emailExistsAnyProvider(email) {
  const v = (email || "").trim();
  if (!v) return { exists: false, provider: null };

  try {
    const r = await Helper.cachedJson(
      `${API}/get-auth-provider`,
      { email: v },
      { ttl: 5 * 60 * 1000 }
    );
    if (r.ok && r.data) {
      return { exists: !!r.data.exists, provider: r.data.authProvider || null };
    }
  } catch (_) {}
  // fail-open: don’t block the user if network hiccups
  return { exists: false, provider: null };
}

//  instantEmailCheck with this debounced + cached version:

async function instantEmailCheck(value) {
  const v = (value || "").trim();

  if (!v) {
    emailNote.textContent = "";
    return;
  }

  // Skip early if format is clearly invalid (prevents 400 spam)
  if (!Helper.isEmailLike(v)) {
    emailNote.textContent = "Please enter a valid email address.";
    emailNote.style.color = "#ffdede";
    return;
  }

  // Reuse the very last result if the user toggled focus but value didn't change
  if (v === lastEmailChecked && lastEmailResult) {
    const { exists, provider, available } = lastEmailResult;
    if (exists) {
      if (provider === "local") {
        emailNote.textContent =
          "Email already registered. “Login” or use “Forgot Password”.";
      } else {
        emailNote.textContent = provider
          ? `Email already used. Sign in with ${providerPretty(provider)}.`
          : "Email already used. Sign in.";
      }
      emailNote.style.color = "#ffdede";
      return;
    }
    // Not found in /get-auth-provider → show availability from /check-email cache result if present
    if (available === true) {
      emailNote.textContent = "Email is available.";
      emailNote.style.color = "#E9E9E9";
      Helper.pulseValid(email);
      return;
    }
  }

  // 1) Authoritative cross-provider check (cached)
  const pf = await emailExistsAnyProvider(v);
  lastEmailChecked = v;

  if (pf.exists) {
    lastEmailResult = { exists: true, provider: pf.provider };
    if (pf.provider === "local") {
      emailNote.textContent =
        "Email already registered. “Login” or use “Forgot Password”.";
    } else {
      emailNote.textContent = pf.provider
        ? `Email already used. Sign in with ${providerPretty(pf.provider)}.`
        : "Email already used. Sign in.";
    }
    emailNote.style.color = "#ffdede";
    return;
  }

  // 2) Only if not found above, ask /check-email (cached)
  const r = await Helper.cachedJson(
    `${API}/check-email`,
    { email: v },
    { ttl: 5 * 60 * 1000 }
  );
  if (!r.ok) {
    emailNote.textContent = "Could not validate email right now.";
    emailNote.style.color = "#ffdede";
    lastEmailResult = null;
    return;
  }

  if (!r.data.available) {
    emailNote.textContent = "Email already used. Sign in.";
    emailNote.style.color = "#ffdede";
    lastEmailResult = { exists: true, provider: "local" };
  } else {
    emailNote.textContent = "Email is available.";
    emailNote.style.color = "#E9E9E9";
    Helper.pulseValid(email);
    lastEmailResult = { exists: false, provider: null, available: true };
  }
}

/* Forgot flow */
async function requestForgot(v) {
  try {
    const authProviderCheck = await Helper.cachedJson(
      `${API}/get-auth-provider`,
      { email: v },
      { ttl: 5 * 60 * 1000 } // cache 5 minutes
    );
    if (
      authProviderCheck.ok &&
      authProviderCheck.data &&
      authProviderCheck.data.authProvider == null
    ) {
      showMsg(`This Email ID doesn't exist.`, false, {
        sticky: true,
        duration: 15000,
      });
      setTimeout(() => {
        const fx = $("fx");
        if (fx) {
          fx.innerHTML += `<span class="inline-alt">You can <span class="link" id="registerLinkForgot">register with this email</span> or use <span class="link" id="googleLinkForgot">Google</span> if you have this account.</span>`;
          $("registerLinkForgot") &&
            ($("registerLinkForgot").onclick = () => setMode("register"));
          $("googleLinkForgot") &&
            ($("googleLinkForgot").onclick = () => btnOAuthGoogle.click());
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
      showMsg(
        `This account uses ${providerName} login. No reset code is needed.`,
        false,
        { sticky: true, duration: 15000 }
      );
      setTimeout(() => {
        const fx = $("fx");
        if (fx) {
          fx.innerHTML += ` <span class="inline-alt">Click <span class="link" id="oauthLinkForgot">here to sign in with ${providerName}</span>.</span>`;
          const oauthLink = $("oauthLinkForgot");
          if (oauthLink)
            oauthLink.onclick = () => {
              provider === "google"
                ? btnOAuthGoogle.click()
                : btnOAuthGitHub.click();
            };
        }
      }, 100);
      return;
    }
  } catch {}

  const r = await Helper.fx(`${API}/forgot-password`, {
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
  verifiedEmail = v;
  if (lastOtp) {
    otpValue.textContent = lastOtp;
    otpReveal.style.display = "flex";
  }
  setMode("otp");
}

/* Verify OTP */
async function verifyOtp(vEmail, vCode) {
  const r = await Helper.fx(`${API}/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: vEmail, otp: vCode }),
  });
  if (!r.ok) {
    showMsg(r.data?.error || `OTP verification failed (${r.status}).`, false);
    return false;
  }
  showMsg("Code verified — almost there.", true);
  verifiedEmail = vEmail;
  setMode("reset");
  return true;
}

/* Submit gate */
async function submitHandler(e) {
  e.preventDefault();
  if (busy) return;
  busy = true;
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");
  showMsg("Processing…", true);
  try {
    if (mode === "login") {
      const id = (identifier.value || "").trim();
      const pw = password.value || "";

      if (!id || !pw) throw new Error("Enter username/email and password.");

      // signature for this exact attempt
      const sig = LoginGuard.makeSig(id, pw);

      // If we just failed with the same payload, reuse the message (no server call)
      const prior = LoginGuard.recallFail(sig);
      if (prior) {
        showMsg(prior.message, false, { sticky: true });
        return;
      }

      // If an identical request is already in-flight, just await it
      const sameInflight = LoginGuard.getInflight(sig);
      if (sameInflight) {
        const r = await sameInflight;
        if (!r.ok) {
          const msg = r.data?.authProvider
            ? `This account uses ${r.data.authProvider} login. Please continue with ${r.data.authProvider} above.`
            : r.data?.error || `Login failed (${r.status}).`;
          LoginGuard.rememberFail(sig, msg, r.status);
          showMsg(msg, false, { sticky: true });
          return;
        }
        // success path mirrors below
        if (r.data?.token) {
          const d = new Date();
          d.setTime(d.getTime() + 7 * 864e5);
          document.cookie = `ff_token=${encodeURIComponent(
            r.data.token
          )}; path=/; expires=${d.toUTCString()}; samesite=strict`;
          try {
            localStorage.setItem("ff_last_id", id);
          } catch {}
        }
        showMsg("Welcome back. Gentle step — strong day. Redirecting…", true);
        setTimeout(() => (location.href = "/"), 650);
        return;
      }

      // Rate-limit bursts
      const gate = LoginGuard.canSend();
      if (!gate.ok) {
        showMsg("Easy—one step at a time.", false);
        return;
      }

      LoginGuard.noteSend();

      // Send once; share result with any concurrent retries
      const reqP = Helper.fx(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: id, password: pw }),
      });
      const r = await LoginGuard.startInflight(sig, reqP);

      if (!r.ok) {
        const msg = r.data?.authProvider
          ? `This account uses ${r.data.authProvider} login. Please continue with ${r.data.authProvider} above.`
          : r.data?.error || `Login failed (${r.status}).`;
        LoginGuard.rememberFail(sig, msg, r.status);
        showMsg(msg, false, { sticky: true });
        return;
      }

      if (r.data?.token) {
        const d = new Date();
        d.setTime(d.getTime() + 7 * 864e5);
        document.cookie = `ff_token=${encodeURIComponent(
          r.data.token
        )}; path=/; expires=${d.toUTCString()}; samesite=strict`;
        try {
          localStorage.setItem("ff_last_id", id);
        } catch {}
      }
      showMsg("Welcome back. Gentle step — strong day. Redirecting…", true);
      setTimeout(() => (location.href = "/"), 650);
    }

    if (mode === "register") {
      if (!email.value.trim() || !passwordReg.value || !confirmPassword.value) {
        throw new Error("Complete all fields.");
      }

      const uCheck = validateUsernameStrict(username.value);
      if (!uCheck.ok) {
        showUnameNote(uCheck.msg, "err");
        return showMsg(uCheck.msg, false, { sticky: true }); // BLOCK creation until fixed
      }

      // normalize the username we send
      const uname = uCheck.value;
      if (passwordReg.value !== confirmPassword.value)
        throw new Error("Passwords do not match.");

      const pf = await emailExistsAnyProvider(email.value);
      if (pf.exists) {
        return showMsg(
          pf.provider
            ? `Email already used. Sign in with ${providerPretty(pf.provider)}.`
            : "Email already used. Try Sign in.",
          false,
          { sticky: true }
        );
      }

      const r = await Helper.fx(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.value.trim(),
          email: email.value.trim(),
          password: passwordReg.value,
        }),
      });
      if (!r.ok)
        return showMsg(
          r.data?.error || `Registration failed (${r.status}).`,
          false
        );
      showMsg("Account created. Breathe in — let’s begin.", true);
      identifier.value = username.value.trim();
      Helper.pulseValid(username);
      Helper.pulseValid(email);
      setMode("login");
    }

    if (mode === "forgot") {
      const v = emailForgot.value.trim();
      if (!v) throw new Error("Enter your email.");
      await requestForgot(v);
    }

    if (mode === "otp") {
      const vEmail = emailOTP.value.trim(),
        vCode = otp.value.trim();
      if (!vEmail || !vCode) throw new Error("Enter email and code.");
      await verifyOtp(vEmail, vCode);
    }

    if (mode === "reset") {
      const vEmail = (
        verifiedEmail ||
        emailOTP.value ||
        emailForgot.value ||
        ""
      ).trim();
      if (!vEmail)
        return showMsg(
          "We lost the previous step. Please go back one step.",
          false
        );
      if (!newPassword.value || !confirmNewPassword.value)
        throw new Error("Enter new password and confirm.");
      if (newPassword.value !== confirmNewPassword.value)
        throw new Error("Passwords do not match.");
      const r = await Helper.fx(`${API}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: vEmail,
          otp: otp.value.trim(),
          newPassword: newPassword.value,
        }),
      });
      if (!r.ok)
        return showMsg(r.data?.error || `Reset failed (${r.status}).`, false);
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

/* Keyboard-first UX */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    statusEl.innerHTML = "";
    if (document.activeElement && document.activeElement.blur)
      document.activeElement.blur();
  }
});

/* Focus-aware helper copy */
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

/* CapsLock detection */
password &&
  password.addEventListener("keyup", (e) => Helper.capsDetector(e, capsLogin));
passwordReg &&
  passwordReg.addEventListener("keyup", (e) => Helper.capsDetector(e, capsReg));
newPassword &&
  newPassword.addEventListener("keyup", (e) =>
    Helper.capsDetector(e, capsReset)
  );

/* Match chips */
confirmPassword &&
  confirmPassword.addEventListener("input", () =>
    Helper.updateMatch(passwordReg, confirmPassword, matchReg, matchRegText)
  );
passwordReg &&
  passwordReg.addEventListener("input", () =>
    Helper.updateMatch(passwordReg, confirmPassword, matchReg, matchRegText)
  );
confirmNewPassword &&
  confirmNewPassword.addEventListener("input", () =>
    Helper.updateMatch(
      newPassword,
      confirmNewPassword,
      matchReset,
      matchResetText
    )
  );
newPassword &&
  newPassword.addEventListener("input", () =>
    Helper.updateMatch(
      newPassword,
      confirmNewPassword,
      matchReset,
      matchResetText
    )
  );

/* Inline validation */
username &&
  username.addEventListener("blur", () => {
    const s = username.value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (s !== username.value) username.value = s;
    if (hasProviderToken(s)) {
      showUnameNote("Usernames can’t include email providers.", "err");
      return;
    }
    if (s.length >= 3 && USERNAME_RE.test(s)) Helper.pulseValid(username);
  });
email &&
  email.addEventListener("blur", () => {
    const v = email.value.trim();
    if (Helper.isEmailLike(v)) Helper.pulseValid(email);
  });

/* OAuth buttons */
btnOAuthGoogle.addEventListener("click", (e) => {
  e.preventDefault();
  Helper.oauthLoading(btnOAuthGoogle, btnOAuthGitHub);
  window.location.href = `${API}/google`;
});
btnOAuthGitHub.addEventListener("click", (e) => {
  e.preventDefault();
  Helper.oauthLoading(btnOAuthGitHub, btnOAuthGoogle);
  window.location.href = `${API}/github`;
});

/* OTP paste */
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

/* Eye toggles */
eyePass.onclick = () => Helper.toggleEye(eyePass, password);
eyePassReg.onclick = () => Helper.toggleEye(eyePassReg, passwordReg);
eyeConfirm.onclick = () => Helper.toggleEye(eyeConfirm, confirmPassword);
eyeNew.onclick = () => Helper.toggleEye(eyeNew, newPassword);
eyeConfirmNew.onclick = () =>
  Helper.toggleEye(eyeConfirmNew, confirmNewPassword);

/* Username check/autogen, email check, strength paints */
btnCheck.onclick = () => checkUsernameAvailability(username.value);
if (username) {
  const debouncedUserCheck = Helper.debounce(
    () => checkUsernameAvailability(username.value),
    320
  );

  username.addEventListener("input", () => {
    const v = username.value;
    const s = v.toLowerCase().replace(/[^a-z0-9]/g, ""); // strip symbols, remove '@'

    if (s !== v) username.value = s;

    const gate = validateUsernameStrict(username.value);
    if (!gate.ok) {
      btnAuto.style.display = "none";
      showUnameNote(gate.msg, "err");
      return; // stop → do not call API yet
    }

    btnAuto.style.display = "none";
    debouncedUserCheck(); // now safe and in scope
  });
}

btnAuto.onclick = autoGenerateUsername;
if (email) {
  const debouncedEmailCheck = Helper.debounce(
    () => instantEmailCheck(email.value),
    450
  );
  email.addEventListener("input", debouncedEmailCheck);
}
passwordReg &&
  passwordReg.addEventListener("input", () =>
    Helper.paintStrength(strengthReg, passwordReg.value)
  );
newPassword &&
  newPassword.addEventListener("input", () =>
    Helper.paintStrength(strengthReset, newPassword.value)
  );
Helper.dotRefs(strengthLogin);
Helper.dotRefs(strengthReg);
Helper.dotRefs(strengthReset);

/* Copy/Hide OTP */
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

/* Tabs & links */
$("tLogin").onclick = () => setMode("login");
$("tRegister").onclick = () => setMode("register");
linkRegister.onclick = () => setMode("register");
linkForgot.onclick = () => setMode("forgot");

/* Submit */
form.addEventListener("submit", submitHandler);

/* Focus management */
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

/* Prefill last identifier */
(function prefillIdentifier() {
  try {
    const last = localStorage.getItem("ff_last_id");
    if (last && identifier) {
      identifier.value = last;
      identifier.select();
    }
  } catch {}
})();

/* Init */
function initAutofocus() {
  if (identifier) {
    identifier.focus();
    identifier.select();
  }
}
setMode("login");
initAutofocus();
