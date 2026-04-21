window.registerJobExtractor({
  name: "greenhouse",
  canHandle(url) {
    return url.includes("greenhouse.io");
  },
  extract() {
    const title = document.querySelector("h1")?.textContent?.trim() || "";
    const company = document.querySelector("meta[property='og:site_name']")?.content || "";
    const locationText = window.pickText([
      ".location",
      ".opening .location",
      ".opening .location-wrapper",
      "#header .location"
    ]);
    const workplaceType = window.detectWorkMode(locationText, document.body.textContent || "");
    const location = window.extractLocationText(locationText);

    return {
      companyName: company,
      jobTitle: title,
      location,
      workplaceType,
      sourcePlatform: "Greenhouse"
    };
  }
});
