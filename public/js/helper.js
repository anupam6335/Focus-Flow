/* ==========================================================================
   helper.js — Shared utilities (globals preserved)
   Loaded BEFORE page scripts. No behavior changes.
   ========================================================================== */
const TIMEOUT = 15000;

/* Tiny DOM helper used everywhere */
const $ = (id) => document.getElementById(id);

/* Escape HTML */
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

/* Debounce */
function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

/* Fetch wrapper with timeout + JSON fallbacks */
async function fx(url, opts = {}, timeout = TIMEOUT) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeout);

  const finalOpts = {
    credentials: "include",
    headers: { Accept: "application/json", ...(opts.headers || {}) },
    method: opts.method || "GET",
    ...opts,
    signal: ctl.signal,
  };

  try {
    const r = await fetch(url, finalOpts);
    clearTimeout(id);

    const text = await r.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    return { ok: r.ok, status: r.status, data, raw: r, error: null };
  } catch (e) {
    clearTimeout(id);
    const friendly =
      e.name === "AbortError"
        ? "Network timeout. Try again."
        : "Network error. Check connection.";
    return { ok: false, status: 0, data: null, raw: null, error: friendly };
  }
}

/* -------- Request cache (dedupe + TTL) -------- */
const ReqCache = (() => {
  const store = new Map();
  const inflight = new Map();
  const DEFAULT_TTL = 5 * 60 * 1000;

  const makeKey = (url, opts = {}) => {
    const method = (opts.method || "GET").toUpperCase();
    const body =
      typeof opts.body === "string"
        ? opts.body
        : JSON.stringify(opts.body || null);
    return `${method} ${url} :: ${body || ""}`;
  };

  async function getOrFetch(
    url,
    opts = {},
    { ttl = DEFAULT_TTL, bypass = false } = {}
  ) {
    const key = makeKey(url, opts);
    const now = Date.now();

    if (!bypass) {
      const hit = store.get(key);
      if (hit && now - hit.ts < ttl) return hit.data;
      if (inflight.has(key)) return inflight.get(key);
    }

    const p = (async () => {
      const r = await fx(url, opts);
      if (r && r.ok && r.data != null) {
        store.set(key, { ts: Date.now(), data: r });
      }
      return r;
    })();

    inflight.set(key, p);
    try {
      return await p;
    } finally {
      inflight.delete(key);
    }
  }

  function clearCache(pattern = null) {
    if (pattern) {
      Array.from(store.keys()).forEach((key) => {
        if (key.includes(pattern)) store.delete(key);
      });
    } else {
      store.clear();
    }
  }

  return { getOrFetch, clearCache };
})();

/* Cached JSON POST helper */
async function cachedJson(url, payload, { ttl, bypassCache } = {}) {
  return ReqCache.getOrFetch(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    },
    { ttl, bypass: !!bypassCache }
  );
}

function providerPretty(p) {
  return p ? p[0].toUpperCase() + p.slice(1) : "";
}

/* Password eye toggle */
function toggleEye(btn, input) {
  const hidden = input.type === "password";
  input.type = hidden ? "text" : "password";
  btn.dataset.state = hidden ? "visible" : "hidden";
  btn.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
}

/* Strength model + painter */
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

function dotRefs(block) {
  if (!block.$wrap) return null;
  if (!block.dots)
    block.dots = Array.from(block.$wrap.querySelectorAll(".dot"));
  return block.dots;
}

function paintStrength(block, pw) {
  if (!block.$wrap) return;
  const dots = dotRefs(block);
  const { score, label, quip } = strengthScore(pw);
  dots.forEach((d, i) => d.classList.toggle("on", i < score));
  block.text.textContent = `${label.toUpperCase()}. ${quip}`;
  block.emoji.textContent = score >= 3 ? "🍵" : score === 2 ? "🌿" : "🫧";
}

/* Visual pulse for completion */
function pulseValid(input) {
  if (!input) return;
  input.classList.add("valid-soft");
  setTimeout(() => input.classList.remove("valid-soft"), 800);
}

/* Basic validators */
function isEmailLike(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/* CapsLock detector (param: keyboard event + chip el) */
function capsDetector(e, chip) {
  if (!chip) return;
  const caps = e.getModifierState && e.getModifierState("CapsLock");
  chip.hidden = !caps;
}

/* Password match chip helper */
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
    textEl.textContent = "Doesn't match";
  }
}

/* OAuth loading decoration (pass current btn and other btn) */
function oauthLoading(btn, otherBtn) {
  btn.classList.add("loading");
  btn.setAttribute("aria-disabled", "true");
  otherBtn && otherBtn.setAttribute("aria-disabled", "true");
  setTimeout(() => {
    btn.classList.remove("loading");
    btn.removeAttribute("aria-disabled");
    otherBtn && otherBtn.removeAttribute("aria-disabled");
  }, 5000);
}

// quick token verify helper (returns structured result)
async function verifyToken() {
  return await fx("/api/auth/verify-token");
}

/* Quick DOM helpers for better performance */
const DOM = {
  cache: new Map(),

  get(id) {
    if (!this.cache.has(id)) {
      this.cache.set(id, document.getElementById(id));
    }
    return this.cache.get(id);
  },

  clearCache() {
    this.cache.clear();
  },
};

/* Batch DOM operations */
function batchDOMUpdates(callback) {
  if (typeof callback !== "function") return;

  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 0);
  }
}

/*  expose as a namespaced helper as well (for other pages) */
window.Helper = {
  TIMEOUT,
  $,
  DOM,
  escapeHtml,
  debounce,
  fx,
  verifyToken,
  cachedJson,
  ReqCache,
  toggleEye,
  strengthScore,
  dotRefs,
  paintStrength,
  pulseValid,
  isEmailLike,
  capsDetector,
  updateMatch,
  oauthLoading,
  batchDOMUpdates,
};
