const cdList = document.querySelector("[data-cd-list]");
const cdSearch = document.querySelector("[data-cd-search]");
const cdEmpty = document.querySelector("[data-cd-empty]");
const wishlistList = document.querySelector("[data-wishlist-list]");
const wishlistEmpty = document.querySelector("[data-wishlist-empty]");
const wishlistCountTarget = document.querySelector("[data-wishlist-count]");
const nextUp = document.querySelector("[data-next-up]");
const nextUpList = document.querySelector("[data-next-up-list]");
const nextUpCountTarget = document.querySelector("[data-next-up-count]");
const countTarget = document.querySelector("[data-cd-count]");
const formatCountTarget = document.querySelector("[data-cd-format-count]");
const genreCountTarget = document.querySelector("[data-cd-genre-count]");
const heroCountTarget = document.querySelector("[data-cd-hero-count]");
const heroWantedTarget = document.querySelector("[data-cd-hero-wanted]");
const cdPopout = document.querySelector("[data-cd-popout]");
const cdPopoutCover = document.querySelector("[data-cd-popout-cover]");
const cdPopoutTitle = document.querySelector("[data-cd-popout-title]");
const cdPopoutArtist = document.querySelector("[data-cd-popout-artist]");
const cdPopoutStars = document.querySelector("[data-cd-popout-stars]");
const cdPopoutLove = document.querySelector("[data-cd-popout-love]");
const cdPopoutCloseButtons = [...document.querySelectorAll("[data-cd-popout-close]")];
const cdPopoutCloseMs = 260;
let cdPopoutCloseTimer;

let cds = [];
let wishlist = [];

function normalize(value = "") {
  return value.toString().trim().toLowerCase();
}

function getInitials(title = "") {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLowerCase() || "cd";
}

function updateSummary(items) {
  if (countTarget) {
    countTarget.textContent = items.length;
  }

  if (formatCountTarget) {
    formatCountTarget.textContent = new Set(items.map((item) => normalize(item.format)).filter(Boolean)).size;
  }

  if (genreCountTarget) {
    genreCountTarget.textContent = new Set(items.map((item) => normalize(item.genre)).filter(Boolean)).size;
  }
}

function renderCds() {
  if (!cdList) {
    return;
  }

  const query = normalize(cdSearch?.value);
  const filtered = cds.filter((cd) => {
    const haystack = normalize(`${cd.title} ${cd.artist} ${cd.year} ${cd.genre} ${cd.price}`);
    const matchesQuery = !query || haystack.includes(query);
    return matchesQuery;
  });

  updateSummary(filtered);
  cdList.innerHTML = "";

  filtered.forEach((cd, index) => {
    cdList.append(createCdCard(cd, index, "collection"));
  });

  if (cdEmpty) {
    cdEmpty.hidden = filtered.length > 0;
  }
}

function renderWishlist() {
  if (!wishlistList) {
    return;
  }

  wishlistList.innerHTML = "";
  renderNextUp();

  const groups = wishlist.reduce((result, cd, index) => {
    const genre = cd.genre || "other";
    const group = result.find((item) => item.genre === genre);
    const entry = { cd, index };

    if (group) {
      group.items.push(entry);
    } else {
      result.push({ genre, items: [entry] });
    }

    return result;
  }, []);

  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "wishlist-genre";
    section.setAttribute("aria-label", `${group.genre} wishlist`);

    const heading = document.createElement("div");
    heading.className = "wishlist-genre-heading";

    const title = document.createElement("h3");
    title.textContent = group.genre;

    const count = document.createElement("span");
    count.textContent = `${group.items.length} wanted`;

    const grid = document.createElement("div");
    grid.className = "cd-list";

    group.items.forEach(({ cd, index }) => {
      grid.append(createCdCard(cd, index, "wishlist"));
    });

    heading.append(title, count);
    section.append(heading, grid);
    wishlistList.append(section);
  });

  if (wishlistEmpty) {
    wishlistEmpty.hidden = wishlist.length > 0;
  }

  if (wishlistCountTarget) {
    wishlistCountTarget.textContent = `${wishlist.length} wanted`;
  }

  if (heroWantedTarget) {
    heroWantedTarget.textContent = wishlist.length.toString().padStart(2, "0");
  }
}

function renderNextUp() {
  if (!nextUp || !nextUpList) {
    return;
  }

  const queued = wishlist
    .map((cd, index) => ({ cd, index }))
    .filter(({ cd }) => cd.nextUp);

  nextUpList.innerHTML = "";

  queued.forEach(({ cd, index }) => {
    nextUpList.append(createCdCard(cd, index, "wishlist"));
  });

  nextUp.hidden = queued.length === 0;

  if (nextUpCountTarget) {
    nextUpCountTarget.textContent = `${queued.length} queued`;
  }
}

function createCdCard(cd, index, shelf) {
  const article = document.createElement("article");
  article.className = "cd-card";
  article.tabIndex = 0;
  article.role = "button";
  article.dataset.cdIndex = index;
  article.dataset.cdShelf = shelf;
  article.dataset.cdNumber = (index + 1).toString().padStart(2, "0");
  article.setAttribute("aria-label", `Open details for ${cd.title}`);
  article.style.setProperty("--cd-index", index);
  article.style.setProperty("--cd-card-delay", `${Math.min(index, 10) * 34}ms`);

  const art = document.createElement("div");
  art.className = "cd-cover";
  if (cd.cover) {
    const cover = document.createElement("img");
    cover.src = cd.cover;
    cover.alt = `${cd.title} cover`;
    art.append(cover);
  } else {
    art.textContent = getInitials(cd.title);
  }

  const details = document.createElement("div");
  details.className = "cd-details";

  const heading = document.createElement("h3");
  if (cd.alternateTitle) {
    heading.className = "cd-title-swap";

    const titleTrack = document.createElement("span");
    titleTrack.className = "cd-title-track";

    const primaryTitle = document.createElement("span");
    primaryTitle.textContent = cd.title;

    const alternateTitle = document.createElement("span");
    alternateTitle.lang = "ja";
    alternateTitle.textContent = cd.alternateTitle;

    titleTrack.append(primaryTitle, alternateTitle);
    heading.append(titleTrack);
  } else {
    heading.textContent = cd.title;
  }

  const artist = document.createElement("p");
  artist.className = "cd-artist";
  artist.textContent = cd.artist;

  const meta = document.createElement("div");
  meta.className = "cd-meta";

  [cd.year, cd.genre, cd.price].filter(Boolean).forEach((value) => {
    const span = document.createElement("span");
    span.textContent = value;
    meta.append(span);
  });

  const notes = document.createElement("p");
  notes.className = "cd-notes";
  notes.textContent = cd.notes || "no notes yet.";

  details.append(heading, artist, meta, notes);
  article.append(art, details);

  return article;
}

function renderStars(rating = 0) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return Array.from({ length: 5 }, (_, index) => (index < safeRating ? "★" : "☆")).join("");
}

function getCdByCard(card) {
  const index = Number(card?.dataset.cdIndex);
  const shelf = card?.dataset.cdShelf;

  if (!Number.isInteger(index)) {
    return null;
  }

  return shelf === "wishlist" ? wishlist[index] : cds[index];
}

function openCdPopout(cd) {
  if (!cdPopout || !cd) {
    return;
  }

  clearTimeout(cdPopoutCloseTimer);
  cdPopout.classList.remove("closing");
  cdPopoutCover.innerHTML = "";

  if (cd.cover) {
    const cover = document.createElement("img");
    cover.src = cd.cover;
    cover.alt = `${cd.title} cover`;
    cdPopoutCover.append(cover);
  } else {
    cdPopoutCover.textContent = getInitials(cd.title);
  }

  cdPopoutTitle.textContent = cd.title;
  cdPopoutArtist.textContent = cd.artist || "";
  cdPopoutStars.textContent = renderStars(cd.rating);
  cdPopoutStars.setAttribute("aria-label", `${cd.rating || 0} out of 5 stars`);
  cdPopoutLove.textContent = cd.love || "i have not written how much i like this one yet.";

  cdPopout.hidden = false;
  document.body.classList.add("cd-popout-open");
  cdPopout.querySelector(".cd-popout-close")?.focus();
}

function closeCdPopout() {
  if (!cdPopout) {
    return;
  }

  if (cdPopout.hidden || cdPopout.classList.contains("closing")) {
    return;
  }

  cdPopout.classList.add("closing");
  document.body.classList.remove("cd-popout-open");

  clearTimeout(cdPopoutCloseTimer);
  cdPopoutCloseTimer = setTimeout(() => {
    cdPopout.hidden = true;
    cdPopout.classList.remove("closing");
  }, cdPopoutCloseMs);
}

document.addEventListener("click", (event) => {
  const card = event.target.closest(".cd-card");
  if (!card) {
    return;
  }

  openCdPopout(getCdByCard(card));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCdPopout();
    return;
  }

  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest(".cd-card");
  if (!card) {
    return;
  }

  event.preventDefault();
  openCdPopout(getCdByCard(card));
});

cdPopoutCloseButtons.forEach((button) => {
  button.addEventListener("click", closeCdPopout);
});

cdSearch?.addEventListener("input", renderCds);

async function loadCds() {
  try {
    const response = await fetch("./data/cds.json");
    if (!response.ok) {
      throw new Error("CD data failed to load");
    }

    cds = await response.json();
  } catch {
    cds = [];
  }

  if (heroCountTarget) {
    heroCountTarget.textContent = cds.length.toString().padStart(2, "0");
  }

  renderCds();
}

async function loadWishlist() {
  try {
    const response = await fetch("./data/wishlist.json");
    if (!response.ok) {
      throw new Error("Wishlist data failed to load");
    }

    wishlist = await response.json();
  } catch {
    wishlist = [];
  }

  renderWishlist();
}

loadCds();
loadWishlist();
