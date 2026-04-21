const SKILL_DICTIONARY = [
  "React",
  "Next.js",
  "JavaScript",
  "TypeScript",
  "Node.js",
  "NestJS",
  "Express",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "GraphQL",
  "REST API",
  "Docker",
  "Kubernetes",
  "AWS",
  "Azure",
  "GCP",
  "Python",
  "Java",
  "Go",
  "C#",
  "Git",
  "Testing",
  "System Design"
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSkills(text: string) {
  const source = text.toLowerCase();
  return SKILL_DICTIONARY.filter((skill) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(skill.toLowerCase())}([^a-z0-9]|$)`, "i");
    return pattern.test(source);
  });
}

function extractYears(text: string) {
  const matches = [...text.toLowerCase().matchAll(/(\d{1,2})\s*\+?\s*years?/g)];
  if (!matches.length) {
    return 0;
  }

  return Math.max(...matches.map((match) => Number(match[1] || 0)));
}

function extractPreferredLocations(text: string) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const result: string[] = [];

  for (const line of lines) {
    if (/^location\s*:/i.test(line)) {
      const value = line.split(":").slice(1).join(":").trim();
      if (value) {
        result.push(value);
      }
    }
  }

  return [...new Set(result)];
}

function detectWorkMode(text: string): "onsite" | "remote" | "hybrid" | "any" {
  const source = text.toLowerCase();
  if (/\bhybrid\b/.test(source)) return "hybrid";
  if (/\bremote\b|work from home|wfh/.test(source)) return "remote";
  if (/\bonsite\b|on-site|on site|in office|in-office/.test(source)) return "onsite";
  return "any";
}

export function parseResumeText(rawText: string) {
  return {
    skills: extractSkills(rawText),
    totalYearsExperience: extractYears(rawText),
    preferredLocations: extractPreferredLocations(rawText),
    workModePreference: detectWorkMode(rawText)
  };
}

export function parseJobRequirements(input: {
  jobTitle?: string;
  jobDescription?: string;
  location?: string;
  workplaceType?: string;
}) {
  const combinedText = [input.jobTitle, input.jobDescription, input.location, input.workplaceType]
    .filter(Boolean)
    .join(" ");

  const requiredSkills = extractSkills(combinedText);
  const yearsRequired = extractYears(combinedText);
  const workMode = detectWorkMode([input.workplaceType, input.jobDescription].filter(Boolean).join(" "));

  return {
    requiredSkills,
    yearsRequired,
    location: input.location ?? "",
    workMode
  };
}
