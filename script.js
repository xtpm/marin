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
  }
}

loadDiscordProfile();
