window.registerJobExtractor({
  name: "lever",
  canHandle(url) {
    return url.includes("jobs.lever.co") || url.includes("lever.co");
  },
  extract() {
    const title = document.querySelector(".posting-headline h2")?.textContent?.trim() || "";
    const company = document.querySelector("meta[property='og:site_name']")?.content || "";
    const locationText = window.pickText([
      ".posting-categories .location",
      ".posting-categories .sort-by-location",
      ".posting-categories"
    ]);
    const workplaceType = window.detectWorkMode(locationText, document.body.textContent || "");
    const location = window.extractLocationText(locationText);

    return {
      companyName: company,
      jobTitle: title,
      location,
      workplaceType,
      sourcePlatform: "Lever"
    };
  }
});
