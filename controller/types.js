/**
 * Structures métier utilisées par les commentaires JSDoc du projet.
 * Ce fichier ne contient aucun code exécuté par l’application.
 * Les dates sans heure sont des chaînes YYYY-MM-DD ; updatedAt est un horodatage ISO.
 *
 * @typedef {'notes'|'tasks'|'preferences'|'app'} DataKey
 * @typedef {null|boolean|number|string|JsonValue[]|Object<string, JsonValue>} JsonValue
 *
 * @typedef {Object} TaskComment
 * @property {string} text - Texte du commentaire cochable.
 * @property {boolean} done - Indique si le commentaire est validé.
 *
 * @typedef {Object} Task
 * @property {string} id - Identifiant unique.
 * @property {string} name - Nom de la tâche.
 * @property {string} description - Description détaillée.
 * @property {'urgent'|'moyen'|'standard'} priority - Niveau de priorité.
 * @property {'professionnel'|'personnel'} category - Catégorie.
 * @property {'todo'|'in-progress'|'done'} [status] - Statut ; todo est utilisé si absent ou invalide.
 * @property {string} start - Date de début, ou chaîne vide.
 * @property {string} end - Date de fin, ou chaîne vide.
 * @property {string} deadline - Date d’échéance, ou chaîne vide.
 * @property {TaskComment[]} [comments] - Commentaires cochables.
 * @property {boolean} [archive] - true pour une tâche archivée.
 * @property {string} [text] - Ancien intitulé accepté par le calendrier.
 *
 * @typedef {Object} Note
 * @property {string} id - Identifiant unique.
 * @property {string} title - Titre de la note.
 * @property {string} content - Contenu de la note.
 * @property {string} updatedAt - Horodatage ISO de la dernière modification.
 *
 * @typedef {'left'|'top-right'|'bottom-right'} TilePosition
 * @typedef {Object} TilePositions
 * @property {TilePosition} agenda - Position de l’agenda.
 * @property {TilePosition} taches - Position des tâches.
 * @property {TilePosition} bloc-note - Position du bloc-notes.
 *
 * @typedef {Object} Preferences
 * @property {'clair'|'sombre'|'vintage'} theme - Thème de l’interface.
 * @property {'vert'|'jaune'|'noir'|'violet'|'bleu'|'bordeaux'|'rouge'|'orange'|'magenta'|'cyan'|'gris'} color - Couleur d’accent.
 * @property {'actuel'|'inverse'|'colonnes'} grid - Disposition de la grille.
 * @property {TilePositions} positions - Positions des trois panneaux.
 *
 * @typedef {Object} AgendaTask
 * @property {string} title - Intitulé affiché.
 * @property {'pro'|'perso'} cat - Catégorie abrégée.
 * @property {'urgent'|'moyen'|'standard'} priority - Priorité normalisée.
 * @property {boolean} isDeadline - Indique si la date représentée est l’échéance.
 *
 * @typedef {Object<string, AgendaTask[]>} AgendaIndex - Tâches regroupées par date YYYY-MM-DD.
 *
 * @typedef {Object} AppData
 * @property {string} [spotify] - Dernier lien Spotify enregistré.
 *
 * @typedef {Object} StorageFileDiagnostic
 * @property {DataKey} key - Clé de stockage.
 * @property {string} file - Chemin absolu du fichier.
 * @property {boolean} exists - Existence supposée ; seul ENOENT indique explicitement l’absence.
 * @property {boolean} writable - Indicateur renvoyé par le diagnostic ; les droits d’écriture ne sont pas testés.
 * @property {boolean} [validJson] - Présent si la lecture et l’analyse JSON réussissent.
 * @property {string} [error] - Message d’erreur si la lecture ou l’analyse échoue.
 *
 * @typedef {Object} StorageDiagnostic
 * @property {string} modelDirectory - Chemin absolu du dossier model.
 * @property {StorageFileDiagnostic[]} files - Résultats de diagnostic des fichiers.
 */

// Rend les typedefs importables par les outils JSDoc ; aucun service ne charge ce fichier.
module.exports = {};
