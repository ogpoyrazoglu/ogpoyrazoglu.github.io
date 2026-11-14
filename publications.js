// Keep the lab in sync with the classic page's existing, crawlable research list.
export const publications = fetch(new URL("./classic.html", import.meta.url))
  .then(async (response) => {
    if (!response.ok) throw new Error(`Research page returned ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    return [...page.querySelectorAll("#research .paper")].map((paper) => {
      const link = paper.querySelector("h3 a");
      const figure = paper.querySelector(".paper-image img");
      return {
        title: link.textContent.trim(),
        href: new URL(link.getAttribute("href"), response.url).href,
        venue: paper.querySelector(".venue").textContent.trim(),
        figure: new URL(figure.getAttribute("src"), response.url).href
      };
    });
  })
  .catch(() => []);

export const whiteboardPapers = publications.then((papers) =>
  papers.length ? [papers.at(-1), ...papers.slice(0, -1)] : []);
