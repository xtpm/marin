const DEVICE_FILTER = { vendorId: 0x36b0, productId: 0x3075, usagePage: 0xff60, usage: 0x61 };
const REPORT_SIZE = 32;
const COMMAND = {
  getProtocol: 0x01,
  customSet: 0x07,
  customGet: 0x08,
  customSave: 0x09,
  unhandled: 0xff
};

const CHANNELS = {
  logo: { label: "Logo", channel: 2, maxBrightness: 70, maxSpeed: 4 },
  backlight: { label: "Backlight", channel: 3, maxBrightness: 180, maxSpeed: 255 },
  side: { label: "Side", channel: 4, maxBrightness: 70, maxSpeed: 4 }
};

const FIXED_EFFECT_COLORS = {
  logo: {
    0: "#1c2225",
    1: "#6bdcff",
    2: "#58d6a7",
    3: "#f2f5f4",
    4: "#2bd66f",
    5: "#3d7bff",
    6: "#ff5abd",
    7: "#ffd34d",
    8: "#f7fbff",
    9: "#1c2225"
  },
  side: {
    0: "#1c2225",
    1: "#6bdcff",
    2: "#58d6a7",
    3: "#f2f5f4",
    4: "#2bd66f",
    5: "#3d7bff",
    6: "#ff5abd",
    7: "#ffd34d",
    8: "#f7fbff",
    9: "#1c2225"
  },
  backlight: {
    0: "#1c2225",
    12: "#58d6a7",
    13: "#2fc8ff",
    14: "#7c89ff",
    17: "#f27bd6",
    21: "#ffd34d",
    22: "#7c89ff",
    23: "#ff7d70",
    24: "#6bdcff",
    25: "#f27bd6",
    28: "#6bdcff",
    29: "#58d6a7",
    30: "#38ef7d",
    32: "#f7fbff"
  }
};

const COLORLESS_EFFECTS = {
  logo: new Set([0, 1, 3, 4, 5, 6, 7, 8, 9]),
  side: new Set([0, 1, 3, 4, 5, 6, 7, 8, 9]),
  backlight: new Set([0, 12, 13, 14, 17, 21, 22, 23, 24, 25, 28, 29, 30, 32])
};

const VALUE = {
  brightness: 1,
  effect: 2,
  speed: 3,
  color: 4
};

const KEY_LABELS = {
  "0,0": "Esc", "0,1": "F1", "0,2": "F2", "0,3": "F3", "0,4": "F4", "0,5": "F5", "0,6": "F6", "0,7": "F7", "0,8": "F8", "0,9": "F9", "0,10": "F10", "0,11": "F11", "0,12": "F12", "0,13": "Del", "0,14": "Home", "0,15": "End",
  "1,0": "`", "1,1": "1", "1,2": "2", "1,3": "3", "1,4": "4", "1,5": "5", "1,6": "6", "1,7": "7", "1,8": "8", "1,9": "9", "1,10": "0", "1,11": "-", "1,12": "=", "1,13": "Backspace", "1,14": "PgUp", "1,15": "PgDn",
  "2,0": "Tab", "2,1": "Q", "2,2": "W", "2,3": "E", "2,4": "R", "2,5": "T", "2,6": "Y", "2,7": "U", "2,8": "I", "2,9": "O", "2,10": "P", "2,11": "[", "2,12": "]", "2,13": "\\", "2,14": "Ins", "2,15": "Pause",
  "3,0": "Caps", "3,1": "A", "3,2": "S", "3,3": "D", "3,4": "F", "3,5": "G", "3,6": "H", "3,7": "J", "3,8": "K", "3,9": "L", "3,10": ";", "3,11": "'", "3,13": "Enter",
  "4,0": "Shift", "4,2": "Z", "4,3": "X", "4,4": "C", "4,5": "V", "4,6": "B", "4,7": "N", "4,8": "M", "4,9": ",", "4,10": ".", "4,11": "/", "4,13": "Shift", "4,14": "Up",
  "5,0": "Ctrl", "5,1": "Win", "5,2": "Alt", "5,5": "Space", "5,9": "Alt", "5,10": "Fn", "5,12": "Ctrl", "5,13": "Left", "5,14": "Down", "5,15": "Right"
};

const DEFAULT_PROFILE = {
  backlight: { effect: 1, color: "#f2f2f2", brightness: 120, speed: 64 },
  logo: { effect: 2, color: "#f2f2f2", brightness: 42, speed: 2 },
  side: { effect: 2, color: "#f2f2f2", brightness: 42, speed: 2 }
};

const LIGHTS_OUT_PROFILE = {
  backlight: { effect: 0, color: "#000000", brightness: 0, speed: 0 },
  logo: { effect: 9, color: "#000000", brightness: 0, speed: 0 },
  side: { effect: 9, color: "#000000", brightness: 0, speed: 0 }
};

let device = null;
let pendingResponse = null;
let definition = null;
let activeChannel = "backlight";
let profile = structuredClone(DEFAULT_PROFILE);

const els = {
  statusDot: document.querySelector("#statusDot"),
  statusText: document.querySelector("#statusText"),
  connectButton: document.querySelector("#connectButton"),
  keyboard: document.querySelector("#keyboard"),
  effectSelect: document.querySelector("#effectSelect"),
  effectDropdown: document.querySelector("#effectDropdown"),
  effectDropdownButton: document.querySelector("#effectDropdownButton"),
  effectDropdownValue: document.querySelector("#effectDropdownValue"),
  effectDropdownMenu: document.querySelector("#effectDropdownMenu"),
  colorInput: document.querySelector("#colorInput"),
  brightnessInput: document.querySelector("#brightnessInput"),
  speedInput: document.querySelector("#speedInput"),
  applyButton: document.querySelector("#applyButton"),
  readButton: document.querySelector("#readButton"),
  offButton: document.querySelector("#offButton"),
  saveProfileButton: document.querySelector("#saveProfileButton"),
  exportProfileButton: document.querySelector("#exportProfileButton"),
  importProfileInput: document.querySelector("#importProfileInput"),
  profileSummary: document.querySelector("#profileSummary"),
  log: document.querySelector("#log")
};

init();

async function init() {
  registerServiceWorker();

  if (!("hid" in navigator)) {
    setStatus("WebHID unavailable", false);
    els.connectButton.disabled = true;
    log("Use Chrome or Edge for WebHID.", true);
  }

  definition = await fetch("vendor/Epomaker_G84.JSON").then((response) => response.json());
  renderKeyboard();
  bindEvents();
  refreshControls();
  refreshPreview();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext) return;
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    log(`service worker failed: ${error.message}`, true);
  });
}

function bindEvents() {
  els.connectButton.addEventListener("click", connect);
  els.applyButton.addEventListener("click", () => applyProfile(profile));
  els.readButton.addEventListener("click", readActiveChannel);
  els.offButton.addEventListener("click", () => {
    profile = structuredClone(LIGHTS_OUT_PROFILE);
    refreshControls();
    refreshPreview();
    applyProfile(profile);
  });
  els.saveProfileButton.addEventListener("click", () => applyProfile(profile, true));
  els.exportProfileButton.addEventListener("click", exportProfile);
  els.importProfileInput.addEventListener("change", importProfile);
  els.effectDropdownButton.addEventListener("click", toggleEffectDropdown);

  document.addEventListener("click", (event) => {
    if (!els.effectDropdown.contains(event.target)) closeEffectDropdown();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEffectDropdown();
  });

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activeChannel = tab.dataset.channel;
      document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
      refreshControls();
    });
  });

  [els.effectSelect, els.colorInput, els.brightnessInput, els.speedInput].forEach((input) => {
    input.addEventListener("input", updateActiveFromControls);
    input.addEventListener("change", updateActiveFromControls);
  });
}

async function connect() {
  try {
    const devices = await navigator.hid.requestDevice({ filters: [DEVICE_FILTER] });
    if (!devices.length) return;

    device = devices[0];
    await device.open();
    device.addEventListener("inputreport", handleInputReport);

    const protocol = await sendVia([COMMAND.getProtocol]);
    const major = protocol[1];
    const minor = protocol[2];
    setStatus(`Connected: VIA ${major}.${minor}`, true);
    log(`connected ${device.productName || "G84"} (${hex(device.vendorId)}:${hex(device.productId)})`);
  } catch (error) {
    log(error.message, true);
    setStatus("Connection failed", false);
  }
}

function handleInputReport(event) {
  if (!pendingResponse) return;
  const bytes = Array.from(new Uint8Array(event.data.buffer));
  pendingResponse.resolve(bytes);
  pendingResponse = null;
}

async function sendVia(bytes) {
  if (!device?.opened) throw new Error("Keyboard is not connected.");
  if (pendingResponse) throw new Error("A VIA command is already waiting for a response.");

  const report = new Uint8Array(REPORT_SIZE);
  report.set(bytes.slice(0, REPORT_SIZE));
  const responsePromise = new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingResponse = null;
      reject(new Error("Keyboard did not respond."));
    }, 1200);
    pendingResponse = {
      resolve: (response) => {
        window.clearTimeout(timeout);
        resolve(response);
      }
    };
  });

  await device.sendReport(0, report);
  const response = await responsePromise;
  if (response[0] === COMMAND.unhandled) {
    throw new Error(`Command unhandled: ${toHex(bytes)}`);
  }
  log(`tx ${toHex(bytes)}  rx ${toHex(response.slice(0, 8))}`);
  return response;
}

async function setValue(channelKey, valueId, data) {
  const channel = CHANNELS[channelKey].channel;
  return sendVia([COMMAND.customSet, channel, valueId, ...data]);
}

async function getValue(channelKey, valueId) {
  const channel = CHANNELS[channelKey].channel;
  return sendVia([COMMAND.customGet, channel, valueId]);
}

async function saveChannel(channelKey) {
  const channel = CHANNELS[channelKey].channel;
  return sendVia([COMMAND.customSave, channel, 0]);
}

async function applyProfile(nextProfile, persist = false) {
  try {
    for (const channelKey of Object.keys(CHANNELS)) {
      const values = nextProfile[channelKey];
      const hsv = hexToHsv(values.color);
      await setValue(channelKey, VALUE.effect, [values.effect]);
      await setValue(channelKey, VALUE.brightness, [clamp(values.brightness, 0, CHANNELS[channelKey].maxBrightness)]);
      await setValue(channelKey, VALUE.speed, [clamp(values.speed, 0, CHANNELS[channelKey].maxSpeed)]);
      if (supportsCustomColor(channelKey, values.effect)) {
        await setValue(channelKey, VALUE.color, [hsv.h, hsv.s]);
      }
      if (persist) await saveChannel(channelKey);
    }
    log(persist ? "profile saved to keyboard" : "profile applied");
  } catch (error) {
    log(error.message, true);
  }
}

async function readActiveChannel() {
  try {
    const effect = await getValue(activeChannel, VALUE.effect);
    const brightness = await getValue(activeChannel, VALUE.brightness);
    const speed = await getValue(activeChannel, VALUE.speed);
    const color = await getValue(activeChannel, VALUE.color);
    profile[activeChannel] = {
      effect: effect[3],
      brightness: brightness[3],
      speed: speed[3],
      color: hsvToHex(color[3], color[4], 255)
    };
    refreshControls();
    refreshPreview();
  } catch (error) {
    log(error.message, true);
  }
}

function renderKeyboard() {
  const unit = 56;
  const gap = 5;
  let y = 0;
  els.keyboard.innerHTML = "";

  definition.layouts.keymap.forEach((row) => {
    let x = 0;
    let props = {};
    let rowHeight = 1;
    row.forEach((item) => {
      if (typeof item === "object") {
        props = { ...props, ...item };
        if (item.y) y += item.y * (unit + gap);
        if (item.x) x += item.x * (unit + gap);
        return;
      }

      const id = item.trim();
      const width = props.w || 1;
      const height = props.h || 1;
      const key = document.createElement("div");
      key.className = "key";
      key.dataset.key = id;
      key.textContent = KEY_LABELS[id] || id;
      key.style.left = `${x}px`;
      key.style.top = `${y}px`;
      key.style.width = `${width * unit + (width - 1) * gap}px`;
      key.style.height = `${height * unit + (height - 1) * gap}px`;
      els.keyboard.append(key);

      x += width * (unit + gap);
      rowHeight = Math.max(rowHeight, height);
      props = {};
    });
    y += rowHeight * (unit + gap);
  });
}

function refreshControls() {
  const channel = CHANNELS[activeChannel];
  const values = profile[activeChannel];
  const effects = getEffects(activeChannel);

  els.effectSelect.innerHTML = "";
  els.effectDropdownMenu.innerHTML = "";
  effects.forEach(([label, value]) => {
    const displayLabel = label.replaceAll("_", " ");
    const option = document.createElement("option");
    option.value = value;
    option.textContent = displayLabel;
    els.effectSelect.append(option);

    const customOption = document.createElement("button");
    customOption.className = "custom-select-option";
    customOption.type = "button";
    customOption.role = "option";
    customOption.dataset.value = value;
    customOption.textContent = displayLabel;
    customOption.addEventListener("click", () => {
      els.effectSelect.value = value;
      closeEffectDropdown();
      updateActiveFromControls();
    });
    els.effectDropdownMenu.append(customOption);
  });

  els.effectSelect.value = values.effect;
  syncEffectDropdown();
  els.colorInput.value = values.color;
  els.colorInput.disabled = !supportsCustomColor(activeChannel, values.effect);
  els.colorInput.parentElement.classList.toggle("disabled", els.colorInput.disabled);
  els.brightnessInput.max = channel.maxBrightness;
  els.brightnessInput.value = values.brightness;
  els.speedInput.max = channel.maxSpeed;
  els.speedInput.value = values.speed;
  refreshSummary();
}

function updateActiveFromControls() {
  const current = profile[activeChannel];
  const effect = Number(els.effectSelect.value);
  const supportsColor = supportsCustomColor(activeChannel, effect);

  profile[activeChannel] = {
    effect,
    color: supportsColor ? els.colorInput.value : current.color,
    brightness: Number(els.brightnessInput.value),
    speed: Number(els.speedInput.value)
  };
  els.colorInput.disabled = !supportsColor;
  els.colorInput.parentElement.classList.toggle("disabled", !supportsColor);
  syncEffectDropdown();
  refreshPreview();
  refreshSummary();
}

function refreshPreview() {
  const color = displayColor("backlight", profile.backlight);
  document.querySelectorAll(".key").forEach((key) => {
    key.style.setProperty("--key-color", color);
  });
}

function refreshSummary() {
  els.profileSummary.innerHTML = "";
  Object.entries(CHANNELS).forEach(([key, channel]) => {
    const values = profile[key];
    const row = document.createElement("div");
    row.className = "summary-row";
    const color = displayColor(key, values);
    const colorNote = supportsCustomColor(key, values.effect) ? "" : "fixed";
    row.innerHTML = `
      <span class="mini-dot" style="--dot:${color}"></span>
      <span>${channel.label}</span>
      <span>${effectName(key, values.effect)}${colorNote ? ` (${colorNote})` : ""}</span>
    `;
    els.profileSummary.append(row);
  });
}

function exportProfile() {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "g84-light-profile.json";
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

async function importProfile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const nextProfile = JSON.parse(await file.text());
    Object.keys(CHANNELS).forEach((key) => {
      if (!nextProfile[key]) throw new Error(`Missing ${key} channel.`);
    });
    profile = nextProfile;
    refreshControls();
    refreshPreview();
    log(`imported ${file.name}`);
  } catch (error) {
    log(error.message, true);
  } finally {
    event.target.value = "";
  }
}

function getEffects(channelKey) {
  const channelName = channelKey === "backlight" ? "Backlight" : channelKey;
  const lighting = definition.menus[0].content.find((section) => section.label.toLowerCase() === channelName.toLowerCase());
  const effect = lighting.content.find((item) => item.label === "Effect");
  return effect.options.map((item) => Array.isArray(item) ? item : [item, item]);
}

function effectName(channelKey, value) {
  const found = getEffects(channelKey).find(([, effectValue]) => Number(effectValue) === Number(value));
  return found ? found[0].replaceAll("_", " ") : String(value);
}

function toggleEffectDropdown() {
  const isOpen = els.effectDropdown.classList.toggle("open");
  els.effectDropdownButton.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    const selected = els.effectDropdownMenu.querySelector(".selected");
    selected?.scrollIntoView({ block: "nearest" });
  }
}

function closeEffectDropdown() {
  els.effectDropdown.classList.remove("open");
  els.effectDropdownButton.setAttribute("aria-expanded", "false");
}

function syncEffectDropdown() {
  const selected = els.effectSelect.selectedOptions[0];
  els.effectDropdownValue.textContent = selected?.textContent || "select effect";
  els.effectDropdownMenu.querySelectorAll(".custom-select-option").forEach((option) => {
    const isSelected = option.dataset.value === els.effectSelect.value;
    option.classList.toggle("selected", isSelected);
    option.setAttribute("aria-selected", String(isSelected));
  });
}

function supportsCustomColor(channelKey, effect) {
  return !COLORLESS_EFFECTS[channelKey].has(Number(effect));
}

function displayColor(channelKey, values) {
  if (supportsCustomColor(channelKey, values.effect)) return values.color;
  return FIXED_EFFECT_COLORS[channelKey][values.effect] || "#f7fbff";
}

function setStatus(text, connected) {
  els.statusText.textContent = text;
  els.statusDot.classList.toggle("connected", connected);
}

function log(message, isError = false) {
  const row = document.createElement("div");
  row.className = isError ? "error" : "";
  row.textContent = `${new Date().toLocaleTimeString()}  ${message}`;
  els.log.prepend(row);
}

function hexToHsv(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return {
    h: Math.round((h / 360) * 255),
    s: Math.round(s * 255),
    v: Math.round(max * 255)
  };
}

function hsvToHex(h, s, v) {
  const hue = (h / 255) * 360;
  const sat = s / 255;
  const val = v / 255;
  const c = val * sat;
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return `#${[r, g, b].map((value) => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function hex(value) {
  return `0x${value.toString(16).padStart(4, "0")}`;
}

function toHex(bytes) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
}
