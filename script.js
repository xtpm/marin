const buttons = [...document.querySelectorAll("[data-panel-button]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const stackButtons = [...document.querySelectorAll("[data-stack-button]")];
const stackLists = [...document.querySelectorAll("[data-stack-list]")];

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
