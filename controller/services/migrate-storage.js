(async () => {
  if (!window.tplanData) return;
  const keys = ["notes", "tasks", "tplan-theme", "tplan-grid", "positionsIframes", "spotify"];
  const legacy = {};
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value === null) continue;
    try { legacy[key] = JSON.parse(value); } catch { legacy[key] = value; }
  }
  if (!Object.keys(legacy).length) return;
  const hasNotes = Array.isArray(await window.tplanData.read("notes")) && (await window.tplanData.read("notes")).length > 0;
  const hasTasks = Array.isArray(await window.tplanData.read("tasks")) && (await window.tplanData.read("tasks")).length > 0;
  for (const key of ["notes", "tasks"]) {
    if (Array.isArray(legacy[key]) && !(key === "notes" ? hasNotes : hasTasks)) await window.tplanData.write(key, legacy[key]);
  }
  const preferences = await window.tplanData.read("preferences");
  if (legacy["tplan-theme"] && preferences.theme === "clair") preferences.theme = legacy["tplan-theme"];
  if (legacy["tplan-grid"] && preferences.grid === "actuel") preferences.grid = legacy["tplan-grid"];
  if (legacy.positionsIframes && !Object.keys(preferences.positions || {}).length) preferences.positions = legacy.positionsIframes;
  await window.tplanData.write("preferences", preferences);
  if (legacy.spotify) await window.tplanData.write("app", { ...(await window.tplanData.read("app")), spotify: legacy.spotify });
  for (const key of Object.keys(legacy)) localStorage.removeItem(key);
})().catch(error => console.error("Migration des anciennes donn?es impossible :", error));
