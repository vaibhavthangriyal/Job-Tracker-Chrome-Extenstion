import { Injectable } from "@nestjs/common";
import { ScoreJobDto } from "./dto/score-job.dto";
import { parseJobRequirements } from "../resumes/resume-parser";
import { ResumesService } from "../resumes/resumes.service";

@Injectable()
export class MatchService {
  constructor(private readonly resumesService: ResumesService) {}

  async scoreJob(userId: string, payload: ScoreJobDto) {
    const resume = await this.resumesService.getOne(userId, payload.resumeId);
    const job = parseJobRequirements(payload);

    const skillScore = this.calculateSkillScore(resume.skills, job.requiredSkills);
    const experienceScore = this.calculateExperienceScore(
      resume.totalYearsExperience,
      job.yearsRequired
    );
    const locationScore = this.calculateLocationScore(
      resume.preferredLocations,
      resume.workModePreference,
      job.location,
      job.workMode
    );

    const total = Math.round(skillScore * 0.6 + experienceScore * 0.25 + locationScore * 0.15);

    return {
      score: total,
      rating: this.mapRating(total),
      breakdown: {
        skill: skillScore,
        experience: experienceScore,
        location: locationScore
      },
      matchedSkills: this.matchedSkills(resume.skills, job.requiredSkills),
      requiredSkills: job.requiredSkills,
      yearsRequired: job.yearsRequired,
      candidateYears: resume.totalYearsExperience,
      reasons: this.buildReasons(
        resume.skills,
        job.requiredSkills,
        resume.totalYearsExperience,
        job.yearsRequired,
        resume.workModePreference,
        job.workMode,
        resume.preferredLocations,
        job.location
      )
    };
  }

  private calculateSkillScore(candidateSkills: string[], requiredSkills: string[]) {
    if (!requiredSkills.length) {
      return 60;
    }

    const matched = this.matchedSkills(candidateSkills, requiredSkills).length;
    return Math.round((matched / requiredSkills.length) * 100);
  }

  private calculateExperienceScore(candidateYears: number, requiredYears: number) {
    if (!requiredYears) {
      return 70;
    }

    if (candidateYears >= requiredYears) {
      return 100;
    }

    if (candidateYears + 1 >= requiredYears) {
      return 70;
    }

    if (candidateYears + 2 >= requiredYears) {
      return 45;
    }

    return 20;
  }

  private calculateLocationScore(
    preferredLocations: string[],
    workModePreference: string,
    jobLocation: string,
    jobWorkMode: string
  ) {
    let workModePart = 70;
    if (jobWorkMode && workModePreference !== "any") {
      workModePart = jobWorkMode === workModePreference ? 100 : 20;
    }

    let locationPart = 70;
    if (jobLocation && preferredLocations.length) {
      const jobText = jobLocation.toLowerCase();
      locationPart = preferredLocations.some((location) =>
        jobText.includes(location.toLowerCase()) || location.toLowerCase().includes(jobText)
      )
        ? 100
        : 30;
    }

    return Math.round((workModePart + locationPart) / 2);
  }

  private matchedSkills(candidateSkills: string[], requiredSkills: string[]) {
    const normalized = new Set(candidateSkills.map((skill) => skill.toLowerCase()));
    return requiredSkills.filter((skill) => normalized.has(skill.toLowerCase()));
  }

  private mapRating(score: number) {
    if (score >= 80) return "Strong Match";
    if (score >= 65) return "Good Match";
    if (score >= 45) return "Weak Match";
    return "Not Recommended";
  }

  private buildReasons(
    candidateSkills: string[],
    requiredSkills: string[],
    candidateYears: number,
    requiredYears: number,
    workModePreference: string,
    jobWorkMode: string,
    preferredLocations: string[],
    jobLocation: string
  ) {
    const matchedSkills = this.matchedSkills(candidateSkills, requiredSkills).length;
    const totalRequired = requiredSkills.length;

    const reasons = [
      totalRequired
        ? `Matched ${matchedSkills}/${totalRequired} required skills`
        : "Could not identify explicit required skills",
      requiredYears
        ? `Experience fit: ${candidateYears}y profile vs ${requiredYears}y required`
        : `Experience fit: ${candidateYears}y profile and no strict years requirement found`
    ];

    if (jobWorkMode) {
      reasons.push(
        workModePreference === "any"
          ? `Job mode: ${jobWorkMode}, resume has no strict mode preference`
          : `Work mode: ${workModePreference} preference vs ${jobWorkMode} job`
      );
    }

    if (jobLocation) {
      reasons.push(
        preferredLocations.length
          ? `Location: ${jobLocation} vs preferred ${preferredLocations.join(", ")}`
          : `Job location: ${jobLocation}`
      );
    }

    return reasons;
  }
}
