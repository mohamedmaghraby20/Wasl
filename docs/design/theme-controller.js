(() => {
  const root = document.documentElement;
  const themeSelect = document.querySelector("#theme-select");
  const modeToggle = document.querySelector("#mode-toggle");
  const densityToggle = document.querySelector("#density-toggle");
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');

  const modeNames = { light: "Light mode", dark: "Dark mode" };
  const themeNames = { wasl: "Wasl Lime", ocean: "Ocean", plum: "Plum" };

  function updateControls() {
    const isDark = root.dataset.mode === "dark";
    const isCompact = root.dataset.density === "compact";
    modeToggle.setAttribute("aria-pressed", String(isDark));
    modeToggle.querySelector("span").textContent = isDark ? "Light mode" : "Dark mode";
    densityToggle.setAttribute("aria-pressed", String(isCompact));
    densityToggle.querySelector("span").textContent = isCompact ? "Comfortable" : "Compact";
    themeSelect.value = root.dataset.theme;
    if (metaThemeColor) {
      const colors = {
        wasl: isDark ? "#12150F" : "#F5F6F2",
        ocean: isDark ? "#111923" : "#F3F6FA",
        plum: isDark ? "#19121E" : "#F7F4F9"
      };
      metaThemeColor.setAttribute("content", colors[root.dataset.theme] || colors.wasl);
    }
    document.title = `Wasl — ${themeNames[root.dataset.theme] || "Design System"} · ${modeNames[root.dataset.mode] || "Preview"}`;
  }

  themeSelect.addEventListener("change", (event) => {
    root.dataset.theme = event.target.value;
    updateControls();
  });
  modeToggle.addEventListener("click", () => {
    root.dataset.mode = root.dataset.mode === "dark" ? "light" : "dark";
    updateControls();
  });
  densityToggle.addEventListener("click", () => {
    root.dataset.density = root.dataset.density === "compact" ? "comfortable" : "compact";
    updateControls();
  });

  // Keep section navigation state aligned with the visible section.
  const links = [...document.querySelectorAll(".sidebar-link")];
  const sections = links.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-15% 0px -72% 0px", threshold: [0, 0.2, 0.5] });
    sections.forEach(section => observer.observe(section));
  }

  // Dismissible feedback examples in the component showcase.
  document.querySelectorAll(".alert-close").forEach((button) => {
    button.addEventListener("click", () => {
      const alert = button.closest(".alert");
      if (alert) alert.remove();
    });
  });

  updateControls();
})();
