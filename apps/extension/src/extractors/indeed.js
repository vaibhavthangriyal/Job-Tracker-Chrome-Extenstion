window.registerJobExtractor({
  name: "indeed",
  canHandle(url) {
    return url.includes("indeed.");
  },
  extract() {
    const title = document.querySelector("h1")?.textContent?.trim() || "";
    const company =
      window.pickText(["[data-company-name]", "[data-testid='company-name']", "[data-company]"]) || "";
    const locationText = window.pickText([
      "#jobLocationText",
      "[data-testid='job-location']",
      "[data-testid='inlineHeader-companyLocation']",
      ".jobsearch-JobInfoHeader-subtitle"
    ]);
    const workplaceType = window.detectWorkMode(locationText, document.body.textContent || "");
    const location = window.extractLocationText(locationText);

    return {
      companyName: company,
      jobTitle: title,
      location,
      workplaceType,
      sourcePlatform: "Indeed"
    };
  }
});
