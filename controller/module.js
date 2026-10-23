// Point d'entrée unique des scripts du renderer.
// Chaque page charge uniquement le service qui correspond à son contenu.
const page = document.body;

if (document.querySelector(".PlacementIframes")) {
  // La migration doit précéder les services qui lisent les préférences.
  await import("./services/migrate-storage.js");
  await Promise.all([
    import("./services/dashboard.js"),
    import("./services/personnalisation.js"),
  ]);
} else if (page.querySelector("#calendar")) {
  await import("./services/agenda.js");
} else if (page.querySelector("#task-list")) {
  await import("./services/tache.js");
} else if (page.querySelector("#liste")) {
  await import("./services/bloc-note.js");
}
