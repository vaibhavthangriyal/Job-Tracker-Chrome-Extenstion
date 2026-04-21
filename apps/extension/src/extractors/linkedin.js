window.registerJobExtractor({
  name: "linkedin",
  canHandle(url) {
    return url.includes("linkedin.com/jobs");
  },
  extract() {
    const title = document.querySelector("h1")?.textContent?.trim() || "";
    const company = document
      .querySelector(".job-details-jobs-unified-top-card__company-name")
      ?.textContent?.trim() || "";
    const locationText = window.pickText([
      ".job-details-jobs-unified-top-card__bullet",
      ".jobs-unified-top-card__bullet",
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__primary-description"
    ]);
    const workModeText = window.pickText([
      ".job-details-jobs-unified-top-card__workplace-type",
      ".jobs-unified-top-card__workplace-type",
      ".job-details-preferences-and-skills__pill"
    ]);

    const workplaceType = window.detectWorkMode(locationText, workModeText);
    const location = window.extractLocationText(locationText);

    return {
      companyName: company,
      jobTitle: title,
      location,
      workplaceType,
      sourcePlatform: "LinkedIn"
    };
  }
});
