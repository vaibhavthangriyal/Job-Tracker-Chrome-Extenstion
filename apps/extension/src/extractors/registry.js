(function initRegistry() {
  if (!window.JobTrackerExtractors) {
    window.JobTrackerExtractors = [];
  }

  window.registerJobExtractor = function registerJobExtractor(extractor) {
    window.JobTrackerExtractors.push(extractor);
  };

  window.detectPlatform = function detectPlatform(hostname) {
    if (hostname.includes("linkedin")) return "LinkedIn";
    if (hostname.includes("indeed")) return "Indeed";
    if (hostname.includes("greenhouse")) return "Greenhouse";
    if (hostname.includes("lever")) return "Lever";
    return hostname.replace(/^www\./, "");
  };

  window.pickText = function pickText(selectors) {
    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value) {
        return value;
      }
    }

    return "";
  };

  window.detectWorkMode = function detectWorkMode(...values) {
    const text = values.filter(Boolean).join(" ").toLowerCase();

    if (/\bhybrid\b/.test(text)) return "hybrid";
    if (/\bremote\b|work from home|wfh/.test(text)) return "remote";
    if (/\bonsite\b|on-site|on site|in-office|in office/.test(text)) return "onsite";
    return "";
  };

  window.extractLocationText = function extractLocationText(...values) {
    const raw = values.filter(Boolean).join(" | ");
    if (!raw) {
      return "";
    }

    const normalized = raw
      .replace(/\s+/g, " ")
      .replace(/\b(remote|hybrid|on-site|onsite|on site|in-office|in office)\b/gi, "")
      .replace(/\s*\|\s*/g, ", ")
      .replace(/\s+,/g, ",")
      .replace(/,+/g, ",")
      .replace(/^,|,$/g, "")
      .trim();

    return normalized;
  };
})();
