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
const cdLink = document.querySelector("[data-cd-link]");
const birthdayCountdown = document.querySelector("[data-birthday-countdown]");
const birthdayDate = document.querySelector("[data-birthday-date]");
const birthdayProgress = document.querySelector("[data-birthday-progress]");
const backgroundMusic = document.querySelector("[data-background-music]");
const musicToggle = document.querySelector("[data-music-toggle]");
const musicStatus = document.querySelector("[data-music-status]");
const musicProgress = document.querySelector("[data-music-progress]");
const musicCurrent = document.querySelector("[data-music-current]");
const musicDuration = document.querySelector("[data-music-duration]");
const musicVolume = document.querySelector("[data-music-volume]");
const musicPlayer = document.querySelector("[data-music-player]");
const musicCover = document.querySelector("[data-music-cover]");
const musicTitle = document.querySelector("[data-music-title]");
const musicArtist = document.querySelector("[data-music-artist]");
const musicPrev = document.querySelector("[data-music-prev]");
const musicNext = document.querySelector("[data-music-next]");
const discordId = "262467539685212160";

const musicTracks = [
  {
    title: "Last Train At 25 O'clock",
    artist: "Lamp",
    src: "./assets/music/last-train-at-25-oclock-lamp.mp3",
    cover: "./assets/music/last-train-at-25-oclock-lamp.jpg",
  },
  {
    title: "Spin The Words",
    artist: "susquatch",
    src: "./assets/music/spin-the-words-susquatch.mp3",
    cover: "./assets/music/spin-the-words-susquatch.jpg",
  },
  {
    title: "My Destiny (2026 Edit)",
    artist: "Delinquent, KCAT, Mike Delinquent Project",
    src: "./assets/music/my-destiny-2026-edit-delinquent.mp3",
    cover: "./assets/music/my-destiny-2026-edit-delinquent.jpg",
  },
  {
    title: "U wld never do it",
    artist: "kuru",
    src: "./assets/music/u-wld-never-do-it-kuru.mp3",
    cover: "./assets/music/u-wld-never-do-it-kuru.jpg",
  },
];

let activeMusicTrack = Math.floor(Math.random() * musicTracks.length);

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

cdLink?.addEventListener("click", (event) => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || cdLink.target) {
    return;
  }

  event.preventDefault();
  cdLink.classList.add("is-loading");
  cdLink.setAttribute("aria-busy", "true");

  window.setTimeout(() => {
    window.location.href = cdLink.href;
  }, 340);
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

function formatMusicTime(secondsValue) {
  const safeSeconds = Number.isFinite(secondsValue) ? Math.max(0, Math.floor(secondsValue)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

if (
  backgroundMusic &&
  musicToggle &&
  musicStatus &&
  musicProgress &&
  musicCurrent &&
  musicDuration &&
  musicVolume &&
  musicCover &&
  musicTitle &&
  musicArtist &&
  musicPrev &&
  musicNext
) {
  backgroundMusic.volume = 0.18;
  let userPausedMusic = false;

  const updateMusicProgress = () => {
    const duration = backgroundMusic.duration || 0;
    const current = backgroundMusic.currentTime || 0;
    const percent = duration ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;

    musicProgress.style.width = `${percent}%`;
    musicCurrent.textContent = formatMusicTime(current);
    musicDuration.textContent = formatMusicTime(duration);
  };

  const renderMusicTrack = () => {
    const track = musicTracks[activeMusicTrack];

    backgroundMusic.src = track.src;
    backgroundMusic.load();
    musicCover.src = track.cover;
    musicCover.alt = `${track.title} cover`;
    musicTitle.textContent = track.title;
    musicArtist.textContent = track.artist;
    updateMusicProgress();
  };

  const updateMusicState = () => {
    const playing = !backgroundMusic.paused;

    musicPlayer?.classList.toggle("is-playing", playing);
    musicToggle.setAttribute("aria-pressed", playing ? "true" : "false");
    musicStatus.textContent = playing ? "pause" : "play";
  };

  musicVolume.addEventListener("input", () => {
    backgroundMusic.volume = Number(musicVolume.value);
  });

  const playActiveTrack = () => {
    backgroundMusic.play().catch(() => {
      musicToggle.setAttribute("aria-pressed", "false");
      musicStatus.textContent = "blocked";
    });
  };

  const startMusicAfterInteraction = () => {
    if (userPausedMusic || !backgroundMusic.paused) {
      return;
    }

    playActiveTrack();
  };

  const changeMusicTrack = (direction) => {
    const wasPlaying = !backgroundMusic.paused;
    activeMusicTrack = (activeMusicTrack + direction + musicTracks.length) % musicTracks.length;
    renderMusicTrack();

    if (wasPlaying) {
      playActiveTrack();
    } else {
      updateMusicState();
    }
  };

  backgroundMusic.addEventListener("loadedmetadata", updateMusicProgress);
  backgroundMusic.addEventListener("timeupdate", updateMusicProgress);
  backgroundMusic.addEventListener("play", updateMusicState);
  backgroundMusic.addEventListener("pause", updateMusicState);
  backgroundMusic.addEventListener("ended", () => changeMusicTrack(1));

  musicPrev.addEventListener("click", () => changeMusicTrack(-1));
  musicNext.addEventListener("click", () => changeMusicTrack(1));

  musicToggle.addEventListener("click", () => {
    if (!backgroundMusic.paused) {
      userPausedMusic = true;
      backgroundMusic.pause();
      return;
    }

    userPausedMusic = false;
    playActiveTrack();
  });

  window.addEventListener("pointerdown", startMusicAfterInteraction, { once: true });
  window.addEventListener("keydown", startMusicAfterInteraction, { once: true });

  renderMusicTrack();
  updateMusicProgress();
  updateMusicState();
}

function getBirthdayWindow(now) {
  const year = now.getFullYear();
  const birthdayStart = new Date(year, 5, 12);
  const birthdayEnd = new Date(year, 5, 13);

  if (now >= birthdayStart && now < birthdayEnd) {
    return {
      isToday: true,
      previous: new Date(year - 1, 5, 12),
      next: birthdayStart,
      upcoming: birthdayStart,
    };
  }

  if (now < birthdayStart) {
    return {
      isToday: false,
      previous: new Date(year - 1, 5, 12),
      next: birthdayStart,
      upcoming: birthdayStart,
    };
  }

  return {
    isToday: false,
    previous: birthdayStart,
    next: new Date(year + 1, 5, 12),
    upcoming: new Date(year + 1, 5, 12),
  };
}

function formatCountdown(ms) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function updateBirthdayCountdown() {
  if (!birthdayCountdown || !birthdayProgress) {
    return;
  }

  const now = new Date();
  const birthday = getBirthdayWindow(now);

  if (birthday.isToday) {
    birthdayCountdown.textContent = "it's my birthday";
    birthdayProgress.style.width = "100%";
  } else {
    birthdayCountdown.textContent = `${formatCountdown(birthday.next.getTime() - now.getTime())} until june 12`;

    const elapsed = now.getTime() - birthday.previous.getTime();
    const span = birthday.next.getTime() - birthday.previous.getTime();
    const percent = span > 0 ? Math.min(100, Math.max(0, (elapsed / span) * 100)) : 0;
    birthdayProgress.style.width = `${percent}%`;
  }

  if (birthdayDate) {
    birthdayDate.dateTime = birthday.upcoming.toISOString();
    birthdayDate.textContent = birthday.isToday ? "june 12 is today" : "june 12";
  }
}

updateBirthdayCountdown();
setInterval(updateBirthdayCountdown, 1000);

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
