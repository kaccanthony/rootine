(function (root) {
  "use strict";

  function hostnameFromUrl(value) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      return parsed.hostname.toLowerCase().replace(/\.$/, "");
    } catch (_error) {
      return null;
    }
  }

  function normalizeWhitelistEntry(value) {
    const trimmed = String(value || "").trim().toLowerCase();
    if (!trimmed) return null;

    const candidate = trimmed.includes("://")
      ? trimmed
      : "https://" + trimmed;
    const hostname = hostnameFromUrl(candidate);
    if (!hostname || hostname.includes(" ")) return null;
    return hostname;
  }

  function isWhitelisted(hostname, whitelist) {
    return whitelist.some(function (entry) {
      const allowed = normalizeWhitelistEntry(entry);
      return (
        allowed !== null &&
        (hostname === allowed || hostname.endsWith("." + allowed))
      );
    });
  }

  function isLocalHtmlUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "file:" && /\.html$/i.test(parsed.pathname);
    } catch (_error) {
      return false;
    }
  }

  const api = {
    hostnameFromUrl,
    isLocalHtmlUrl,
    isWhitelisted,
    normalizeWhitelistEntry,
  };

  root.RootineDomain = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
