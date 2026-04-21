export const APPLICATION_STATUSES = [
  "Saved",
  "Applied",
  "OA",
  "Interview",
  "HR Round",
  "Rejected",
  "Offer",
  "Accepted",
  "Withdrawn"
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface JobApplication {
  _id?: string;
  companyName: string;
  jobTitle: string;
  location?: string;
  employmentType?: string;
  workplaceType?: string;
  salary?: string;
  sourcePlatform?: string;
  jobUrl?: string;
  companyWebsite?: string;
  jobDescription?: string;
  recruiterName?: string;
  recruiterEmail?: string;
  recruiterLinkedIn?: string;
  applicationDate: string;
  status: ApplicationStatus;
  notes?: string;
  followUpDate?: string;
  referral?: boolean;
  resumeVersion?: string;
  coverLetterUsed?: boolean;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResumeProfile {
  _id: string;
  fileName: string;
  skills: string[];
  totalYearsExperience: number;
  preferredLocations: string[];
  workModePreference: "onsite" | "remote" | "hybrid" | "any";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JobMatchResult {
  score: number;
  rating: "Strong Match" | "Good Match" | "Weak Match" | "Not Recommended";
  breakdown: {
    skill: number;
    experience: number;
    location: number;
  };
  matchedSkills: string[];
  requiredSkills: string[];
  yearsRequired: number;
  candidateYears: number;
  reasons: string[];
}
