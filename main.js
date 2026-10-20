// Processus principal Electron : fenêtre, lecture des données, sauvegarde du suivi.
const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
// electron-updater est optionnel en développement : si le module manque (npm install pas relancé), l'appli démarre quand même
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch { console.warn('electron-updater absent : lance « npm install » pour activer les mises à jour'); }
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
const SAVE_FILE = () => path.join(app.getPath('userData'), 'pokedex-suivi.json');

let mainWin = null;

// Mises à jour automatiques : l'appli installée vérifie les releases GitHub au démarrage (et toutes les 2 h),
// télécharge la nouvelle version en arrière-plan et l'installe à la fermeture (ou tout de suite si on clique « Redémarrer »).
function setupUpdates() {
  if (!app.isPackaged || !autoUpdater) return; // pas de mise à jour en mode développement (npm start)
  const send = (ch, data) => mainWin && !mainWin.isDestroyed() && mainWin.webContents.send(ch, data);
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (i) => send('update:status', { state: 'downloading', version: i.version }));
  autoUpdater.on('update-downloaded', (i) => send('update:status', { state: 'ready', version: i.version }));
  autoUpdater.on('error', (e) => console.error('Mise à jour :', e && e.message));
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 4000);
  setInterval(check, 2 * 60 * 60 * 1000);
}
ipcMain.handle('update:install', () => autoUpdater && autoUpdater.quitAndInstall());
ipcMain.handle('app:version', () => app.getVersion());

function createWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 1000,
    minHeight: 640,
    backgroundColor: '#14161c',
    title: 'Pokédex',
    icon: path.join(__dirname, 'src', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWin = win;
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // Les liens externes s'ouvrent dans le navigateur
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Lecture d'un fichier de données (chemin relatif à data/, sans sortir du dossier)
ipcMain.handle('data:read', async (_e, rel) => {
  const full = path.normalize(path.join(DATA_DIR, rel));
  if (!full.startsWith(DATA_DIR)) throw new Error('Chemin refusé');
  if (!fs.existsSync(full)) return null;
  return fs.promises.readFile(full, 'utf-8');
});

ipcMain.handle('save:load', async () => {
  try {
    return JSON.parse(await fs.promises.readFile(SAVE_FILE(), 'utf-8'));
  } catch {
    return null;
  }
});

let writing = Promise.resolve();
ipcMain.handle('save:write', async (_e, obj) => {
  // écriture atomique, les sauvegardes s'enchaînent sans se chevaucher
  writing = writing.then(async () => {
    const tmp = SAVE_FILE() + '.tmp';
    await fs.promises.writeFile(tmp, JSON.stringify(obj), 'utf-8');
    await fs.promises.rename(tmp, SAVE_FILE());
  });
  await writing;
  return true;
});

ipcMain.handle('save:export', async (_e, obj) => {
  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Exporter le suivi',
    defaultPath: 'pokedex-suivi.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  await fs.promises.writeFile(filePath, JSON.stringify(obj, null, 1), 'utf-8');
  return true;
});

ipcMain.handle('save:import', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Importer un suivi',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  return JSON.parse(await fs.promises.readFile(filePaths[0], 'utf-8'));
});

// Sauvegarde d'un jeu Pokémon (émulateur ou cartouche) : on renvoie juste les octets, la lecture se fait dans src/savereader.js
ipcMain.handle('gamesave:open', async () => {
  const { filePaths, canceled } = await dialog.showOpenDialog({
    title: 'Choisir la sauvegarde du jeu',
    filters: [
      { name: 'Sauvegardes Pokémon', extensions: ['sav', 'srm', 'sa1', 'dsv', 'dat', 'bin'] },
      { name: 'Tous les fichiers', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  const st = await fs.promises.stat(filePaths[0]);
  if (st.size > 4 * 1024 * 1024) return { name: path.basename(filePaths[0]), tooBig: true };
  return { name: path.basename(filePaths[0]), data: await fs.promises.readFile(filePaths[0]) };
});

ipcMain.handle('journal:open', async () => {
  const win = new BrowserWindow({ width: 1100, height: 800, autoHideMenuBar: true, backgroundColor: '#14161c', title: 'Journal des modifications' });
  win.loadFile(path.join(__dirname, 'journal', 'journal.html'));
});

app.whenReady().then(() => { createWindow(); setupUpdates(); });
app.on('window-all-closed', () => app.quit());
