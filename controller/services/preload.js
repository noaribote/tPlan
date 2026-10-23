/**
 * @typedef {import('../types').DataKey} DataKey
 * @typedef {import('../types').JsonValue} JsonValue
 * @typedef {import('../types').Task} Task
 * @typedef {import('../types').StorageDiagnostic} StorageDiagnostic
 */
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('tplanData', {
  /**
   * Demande au processus principal de lire le fichier JSON associé à une clé.
   * @param {DataKey} key - Type de données à charger.
   * @returns {Promise<JsonValue>} Données lues ; rejetée si la clé ou la lecture est invalide.
   * @description Types utilisés : DataKey, JsonValue, Promise, Electron.IpcRenderer.
   */
  read: key => ipcRenderer.invoke('data:read', key),
  /**
   * Demande au processus principal de sauvegarder les données ; les préférences sont fusionnées côté principal.
   * @param {DataKey} key - Type de données à sauvegarder.
   * @param {JsonValue} value - Valeur JSON à écrire, ou champs de préférences à fusionner.
   * @returns {Promise<boolean>} true après écriture ; rejetée si la clé ou la sauvegarde est invalide.
   * @description Types utilisés : DataKey, JsonValue, boolean, Promise, Electron.IpcRenderer.
   */
  write: (key, value) => ipcRenderer.invoke('data:write', key, value),
  /**
   * Demande le diagnostic des fichiers JSON du dossier model.
   * @description Entrées : aucun paramètre ; utilise ipcRenderer.
   * @returns {Promise<StorageDiagnostic>} Diagnostic de lecture des fichiers ; rejetée si la requête échoue.
   * @description Types utilisés : StorageDiagnostic, Promise, Electron.IpcRenderer.
   */
  diagnose: () => ipcRenderer.invoke('data:diagnose'),
  /**
   * Abonne une fonction aux notifications de modification des tâches émises par le processus principal.
   * @param {(tasks: Task[]) => void} callback - Fonction recevant la liste des tâches sauvegardées.
   * @returns {import('electron').IpcRenderer} Instance retournée par ipcRenderer.on ; aucun désabonnement n’est fourni.
   * @description Types utilisés : Task[], fonction de rappel, void, Electron.IpcRenderer.
   */
  onTasksChanged: callback =>
    ipcRenderer.on('data:tasks-changed',
      /**
       * Transmet la liste des tâches au callback enregistré.
       * @param {import('electron').IpcRendererEvent} _event - Événement IPC reçu, non utilisé.
       * @param {Task[]} tasks - Liste diffusée après une sauvegarde.
       * @returns {void} Retour du callback, sans valeur selon le contrat d’abonnement.
       * @description Types utilisés : Electron.IpcRendererEvent, Task[], fonction de rappel, void.
       */
      (_event, tasks) => callback(tasks))
});
