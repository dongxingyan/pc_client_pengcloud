/* jshint node: true, esversion: 6 */

var app = require('app');
var path = require('path');
var BrowserWindow = require('browser-window');

var mainWindow;

function openMainWindow() {
    console.log('openMainWindow');
    if (mainWindow) {
        mainWindow.focus();
    } else {
        mainWindow = new BrowserWindow({
            show: false,
            fullscreen: false,
            fullscreenable: false,
            width: 400,
            height: 550,
            title: app.getName(),
            icon: path.join(__dirname, '/../', 'configuration', 'favicon.png'),
        });
        mainWindow.setMenu(null);

        mainWindow.webContents.on('dom-ready', function() {
            mainWindow.show();
        });

        mainWindow.loadURL('file://' + __dirname + '/../desktop-client/index.main.html');

        mainWindow.openDevTools();

        mainWindow.on('closed', function() {
            console.log('mainWindow.on closed');
            mainWindow = null;
        });
    }
}

function closeMainWindow() {
    if (mainWindow) {
        mainWindow.close();
    }
}

module.exports = {
    open: openMainWindow,
    close: closeMainWindow
};
