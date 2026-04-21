window.registerJobExtractor({
  name: "generic",
  canHandle() {
    return true;
  },
  extract() {
    const title = document.querySelector("h1")?.textContent?.trim() || document.title || "";
    const description =
      document.querySelector("main")?.textContent?.trim() ||
      document.querySelector("article")?.textContent?.trim() ||
      "";
    const companyFromMeta = document.querySelector("meta[property='og:site_name']")?.content || "";
    const locationText = window.pickText([
      "[data-job-location]",
      "[data-testid='job-location']",
      ".location",
      "[itemprop='jobLocation']",
      "meta[property='job:location']"
    ]);
    const workplaceType = window.detectWorkMode(locationText, description, document.body.textContent || "");
    const location = window.extractLocationText(locationText);

    return {
      companyName: companyFromMeta,
      jobTitle: title,
      location,
      workplaceType,
      sourcePlatform: window.detectPlatform(window.location.hostname),
      jobUrl: window.location.href,
      jobDescription: description
    };
  }
});
