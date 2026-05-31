const buttons = [...document.querySelectorAll("[data-panel-button]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const projectButtons = [...document.querySelectorAll("[data-project-button]")];
const projectLists = [...document.querySelectorAll("[data-project-list]")];
const stackButtons = [...document.querySelectorAll("[data-stack-button]")];
const stackLists = [...document.querySelectorAll("[data-stack-list]")];
const guestbookModeButtons = [...document.querySelectorAll(".guestbook-mode button")];
const guestbookForm = document.querySelector("[data-guestbook-form]");
const guestbookList = document.querySelector("[data-guestbook-list]");
const guestbookFeedback = document.querySelector("[data-guestbook-feedback]");
const guestbookSubmit = document.querySelector("[data-guestbook-submit]");
const currentTime = document.querySelector("[data-current-time]");
const discordId = "262467539685212160";

function showPanel(panelName) {
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.panelButton === panelName);
  });

  panels.forEach((panel) => {
    const active = panel.dataset.panel === panelName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    showPanel(button.dataset.panelButton);
  });
});

projectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const projectName = button.dataset.projectButton;
    button.closest(".tab-switch")?.setAttribute("data-active", projectName);

    projectButtons.forEach((item) => {
      item.classList.toggle("active", item.dataset.projectButton === projectName);
    });

    projectLists.forEach((list) => {
      const active = list.dataset.projectList === projectName;
      list.hidden = !active;
      list.classList.toggle("active", active);
    });
  });
});

stackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const stackName = button.dataset.stackButton;
    button.closest(".tab-switch")?.setAttribute("data-active", stackName);

    stackButtons.forEach((item) => {
      item.classList.toggle("active", item.dataset.stackButton === stackName);
    });

    stackLists.forEach((list) => {
      const active = list.dataset.stackList === stackName;
      list.hidden = !active;
      list.classList.toggle("active", active);
    });
  });
});

guestbookModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    button.closest(".guestbook-mode")?.setAttribute("data-active", button.dataset.guestbookVisibility);
    guestbookModeButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

function formatGuestbookDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).toLowerCase();
}

function updateCurrentTime() {
  if (!currentTime) {
    return;
  }

  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).formatToParts(now);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  currentTime.dateTime = now.toISOString();
  currentTime.textContent = `${value.month.toLowerCase()} ${value.day}, ${value.year}  ${value.hour}:${value.minute}:${value.second} ${value.dayPeriod.toLowerCase()} (${value.timeZoneName})`;
}

updateCurrentTime();
setInterval(updateCurrentTime, 1000);

function renderGuestbook(entries = []) {
  if (!guestbookList) {
    return;
  }

  guestbookList.innerHTML = "";

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "guestbook-empty";
    empty.textContent = "nothing on the wall yet.";
    guestbookList.append(empty);
    return;
  }

  entries.forEach((entry) => {
    const article = document.createElement("article");
    article.className = "guestbook-entry";

    const header = document.createElement("div");
    const identity = document.createElement("span");
    const name = document.createElement("strong");
    const time = document.createElement("time");
    const message = document.createElement("p");

    name.textContent = entry.name || "anonymous";
    identity.append(name);

    if (entry.discord) {
      const discord = document.createElement("small");
      discord.textContent = entry.discord.startsWith("@") ? entry.discord : `@${entry.discord}`;
      identity.append(discord);
    }

    time.dateTime = entry.createdAt || "";
    time.textContent = formatGuestbookDate(entry.createdAt);
    message.textContent = entry.message || "";

    header.append(identity, time);
    article.append(header, message);

    if (entry.loved) {
      const loved = document.createElement("b");
      loved.className = "guestbook-loved";
      loved.textContent = "loved by retrial";
      article.append(loved);
    }

    guestbookList.append(article);
  });
}

async function loadGuestbook() {
  if (!guestbookList) {
    return;
  }

  try {
    const response = await fetch("/api/guestbook");
    if (!response.ok) {
      throw new Error("guestbook request failed");
    }

    const data = await response.json();
    renderGuestbook(data.entries);
  } catch {
    if (guestbookFeedback) {
      guestbookFeedback.textContent = "guestbook is quiet right now.";
    }
  }
}

guestbookForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(guestbookForm);
  const visibility = guestbookModeButtons.find((button) => button.classList.contains("active"))?.dataset
    .guestbookVisibility || "public";

  if (guestbookFeedback) {
    guestbookFeedback.textContent = "sending...";
  }

  if (guestbookSubmit) {
    guestbookSubmit.disabled = true;
  }

  try {
    const response = await fetch("/api/guestbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        discord: formData.get("discord"),
        message: formData.get("message"),
        visibility,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "message failed");
    }

    if (guestbookFeedback) {
      guestbookFeedback.textContent = visibility === "private" ? "private note sent." : "added to the wall.";
    }

    guestbookForm.reset();

    if (visibility === "public") {
      renderGuestbook(data.entries);
    }
  } catch (error) {
    if (guestbookFeedback) {
      guestbookFeedback.textContent = error.message || "message failed.";
    }
  } finally {
    if (guestbookSubmit) {
      guestbookSubmit.disabled = false;
    }
  }
});

function getAvatarUrl(user) {
  if (!user?.id || !user?.avatar) {
    return "";
  }

  const extension = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}

function getActivityText(activities = []) {
  const customStatus = activities.find((activity) => activity.type === 4 && activity.state);
  if (customStatus) {
    return customStatus.state;
  }

  const richActivity = activities.find((activity) => activity.name && activity.type !== 4);
  if (!richActivity) {
    return "not doing anything public right now.";
  }

  if (richActivity.details) {
    return `${richActivity.name} - ${richActivity.details}`;
  }

  return richActivity.name;
}

function getRichActivity(activities = []) {
  return activities.find((activity) => activity.name && activity.type !== 4 && activity.name !== "Spotify");
}

function getActivityAssetUrl(activity) {
  const image = activity?.assets?.large_image || activity?.assets?.small_image;
  if (!image) {
    return "";
  }

  if (image.startsWith("mp:")) {
    return `https://media.discordapp.net/${image.slice(3)}`;
  }

  if (image.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${image.slice(8)}`;
  }

  if (image.startsWith("http")) {
    return image;
  }

  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
  }

  return "";
}

function updateNowPlaying(data) {
  const image = document.querySelector("[data-now-playing-image]");
  const title = document.querySelector("[data-now-playing-title]");
  const detail = document.querySelector("[data-now-playing-detail]");
  if (!image || !title || !detail) {
    return;
  }

  const activity = getRichActivity(data.activities);
  const customStatus = data.activities?.find((item) => item.type === 4 && item.state);

  if (activity) {
    const imageUrl = getActivityAssetUrl(activity);
    title.textContent = activity.name;
    detail.textContent = activity.details || activity.state || "active on discord.";
    if (imageUrl) {
      image.src = imageUrl;
      image.alt = activity.assets?.large_text || `${activity.name} activity image`;
      image.hidden = false;
    } else {
      image.hidden = true;
      image.removeAttribute("src");
    }
    return;
  }

  image.hidden = true;
  image.removeAttribute("src");

  if (customStatus) {
    title.textContent = "custom status";
    detail.textContent = customStatus.state;
    return;
  }

  title.textContent = "nothing active";
  detail.textContent = "no public activity right now.";
}

function updateSpotify(data) {
  const card = document.querySelector("[data-spotify-card]");
  const cover = document.querySelector("[data-spotify-cover]");
  const title = document.querySelector("[data-spotify-title]");
  const artist = document.querySelector("[data-spotify-artist]");
  const progress = document.querySelector("[data-spotify-progress]");
  if (!card || !cover || !title || !artist || !progress) {
    return;
  }

  const spotify = data.spotify;
  if (!data.listening_to_spotify || !spotify) {
    card.dataset.listening = "false";
    cover.hidden = true;
    cover.removeAttribute("src");
    title.textContent = "not listening";
    artist.textContent = "spotify is quiet right now.";
    progress.style.width = "0%";
    return;
  }

  const started = spotify.timestamps?.start || 0;
  const ended = spotify.timestamps?.end || 0;
  const percent = started && ended ? Math.min(100, Math.max(0, ((Date.now() - started) / (ended - started)) * 100)) : 0;

  card.dataset.listening = "true";
  title.textContent = spotify.song || "unknown song";
  artist.textContent = spotify.artist || "unknown artist";
  progress.style.width = `${percent}%`;

  if (spotify.album_art_url) {
    cover.src = spotify.album_art_url;
    cover.alt = `${spotify.album || spotify.song} cover`;
    cover.hidden = false;
  } else {
    cover.hidden = true;
    cover.removeAttribute("src");
  }
}

async function loadDiscordProfile() {
  const card = document.querySelector("[data-discord-card]");
  if (!card) {
    return;
  }

  const avatar = card.querySelector("[data-discord-avatar]");
  const name = card.querySelector("[data-discord-name]");
  const status = card.querySelector("[data-discord-status]");
  const handle = card.querySelector("[data-discord-handle]");
  const activity = card.querySelector("[data-discord-activity]");

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
    if (!response.ok) {
      throw new Error("Lanyard request failed");
    }

    const payload = await response.json();
    const data = payload.data;
    const user = data.discord_user;
    const displayName = user.global_name || user.display_name || user.username || "retrial";
    const discordStatus = data.discord_status || "offline";
    const avatarUrl = getAvatarUrl(user);

    card.dataset.status = discordStatus;
    name.textContent = displayName;
    status.textContent = discordStatus;
    handle.textContent = `@${user.username}`;
    activity.textContent = getActivityText(data.activities);
    updateNowPlaying(data);
    updateSpotify(data);

    if (avatarUrl) {
      avatar.src = avatarUrl;
      avatar.alt = `${displayName}'s Discord avatar`;
      avatar.hidden = false;
    }

  } catch {
    card.dataset.status = "offline";
    name.textContent = "discord unavailable";
    status.textContent = "offline";
    handle.textContent = "@retriai";
    activity.textContent = "lanyard did not respond.";
    updateNowPlaying({ activities: [] });
    updateSpotify({ listening_to_spotify: false });
  }
}

loadDiscordProfile();
setInterval(loadDiscordProfile, 30000);
loadGuestbook();
