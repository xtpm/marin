const buttons = [...document.querySelectorAll("[data-panel-button]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const stackButtons = [...document.querySelectorAll("[data-stack-button]")];
const stackLists = [...document.querySelectorAll("[data-stack-list]")];
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

stackButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const stackName = button.dataset.stackButton;

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
