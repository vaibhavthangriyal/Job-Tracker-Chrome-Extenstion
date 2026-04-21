const TECHNOLOGY_KEYWORDS = [
  "react",
  "next.js",
  "javascript",
  "typescript",
  "node.js",
  "nestjs",
  "express",
  "python",
  "java",
  "c#",
  "c++",
  "go",
  "rust",
  "html",
  "css",
  "tailwind",
  "mongodb",
  "postgresql",
  "mysql",
  "redis",
  "graphql",
  "rest api",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "git"
];

const SKILL_KEYWORDS = [
  "communication",
  "problem solving",
  "collaboration",
  "teamwork",
  "leadership",
  "stakeholder management",
  "agile",
  "scrum",
  "debugging",
  "testing",
  "system design",
  "analytical thinking",
  "time management",
  "mentoring",
  "ownership"
];

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseKeyword(keyword) {
  return keyword
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractKeywordMatches(text, keywords) {
  const source = (text || "").toLowerCase();

  return keywords
    .filter((keyword) => {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword.toLowerCase())}([^a-z0-9]|$)`, "i");
      return pattern.test(source);
    })
    .map(titleCaseKeyword);
}

function runExtractor() {
  const url = window.location.href;
  const extractors = window.JobTrackerExtractors || [];

  const extractor = extractors.find((candidate) => {
    try {
      return candidate.canHandle(url);
    } catch {
      return false;
    }
  });

  const extracted = extractor ? extractor.extract() : {};
  const fallbackDescription =
    document.querySelector("main")?.textContent?.trim() ||
    document.querySelector("article")?.textContent?.trim() ||
    "";
  const jobDescription = extracted.jobDescription || fallbackDescription;
  const location =
    extracted.location ||
    window.extractLocationText(
      window.pickText([
        "[data-job-location]",
        "[data-testid='job-location']",
        "#jobLocationText",
        ".location",
        "[itemprop='jobLocation']"
      ])
    );
  const workplaceType =
    extracted.workplaceType ||
    window.detectWorkMode(location, jobDescription, document.body.textContent || "");
  const technologies = extractKeywordMatches(jobDescription, TECHNOLOGY_KEYWORDS);
  const skills = extractKeywordMatches(jobDescription, SKILL_KEYWORDS);
  const tags = [...new Set([...technologies, ...skills])];

  return {
    companyName: extracted.companyName || "",
    jobTitle: extracted.jobTitle || document.querySelector("h1")?.textContent?.trim() || document.title || "",
    location,
    workplaceType,
    sourcePlatform: extracted.sourcePlatform || window.detectPlatform(window.location.hostname),
    jobUrl: extracted.jobUrl || window.location.href,
    jobDescription,
    technologies,
    skills,
    tags,
    applicationDate: new Date().toISOString(),
    status: "Applied",
    extractorUsed: extractor?.name || "none"
  };
}

chrome.runtime.onMessage.addListener((request, _, sendResponse) => {
  if (request?.type === "EXTRACT_JOB") {
    sendResponse({ success: true, payload: runExtractor() });
    return true;
  }
  return false;
});
