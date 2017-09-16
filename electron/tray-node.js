/* jshint node: true, esversion: 6 */

const path = require('path');
const electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const Tray = electron.Tray;
const Menu = electron.Menu;

var mainWindow = require('./main-window.js');

var tray = null;

module.exports.create = function(imageFile, ids) {
    if (tray) {
        tray.destroy();
        tray = null;
    }
    tray = new Tray(imageFile);
    var contextMenu = Menu.buildFromTemplate([{
        label: ids.IDS_DESKTOPCLIENT_MENU_OPEN,
        click: function(menuItem, browserWindow) {
            mainWindow.open();
        }
    }, {
        label: ids.IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS,
        click: function(menuItem, browserWindow) {
            // browserWindow.openDevTools();
            console.log("OPEN DEV TOOLS")
        }
    }, {
        label: ids.IDS_DESKTOPCLIENT_MENU_QUIT,
        click: function(menuItem, browserWindow) {
            app.quit();
        }
    }]);
    tray.setToolTip(app.getName());
    tray.setContextMenu(contextMenu);

    tray.on('click', function(event, bounds) {
        mainWindow.open();
    })
};

module.exports.setImage = function(path) {
    tray.setImage(path);
};
