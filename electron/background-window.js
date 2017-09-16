/* jshint node: true, esversion: 6 */

var BrowserWindow = require('browser-window'); // Module to create native browser window.

var backgroundWindow;

function openBackgroundWindow() {
    backgroundWindow = new BrowserWindow({
        show: false,
    });

    // and load the index.html of the app.
    backgroundWindow.loadURL('file://' + __dirname + '/background-window.html');
    backgroundWindow.openDevTools();
    backgroundWindow.on('closed', function() {
        console.log('backgroundWindow.on closed');
        backgroundWindow = null;
    });
}

function closeBackgroundWindow() {
    if (backgroundWindow) {
        backgroundWindow.close();
    }
}

module.exports = {
    open: openBackgroundWindow,
    close: closeBackgroundWindow,
    register: function(host, alias, username, password, callback, storePassword) {
        backgroundWindow.webContents.send('register', host, alias, username, password, callback, storePassword);
    },
    unregister: function() {
        backgroundWindow.webContents.send('unregister', arguments);
    },
    callAccept: function(message) {
        backgroundWindow.webContents.send('callAccept', message);
    },
    callReject: function(message) {
        backgroundWindow.webContents.send('callReject', message);
    },
};
