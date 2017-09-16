/* jshint node: true, esversion: 6 */


// var app = require('app');
var path = require('path');
var BrowserWindow = require('browser-window');

var notificationWindows = {};

function openIncomingCallWindow(message) {
    console.log('openIncomingCallWindow', message);

    var width = 350;
    var height = 56;
    var notificationWindow = new BrowserWindow({
        skipTaskbar: process.platform != 'darwin',
        // transparent: process.platform != 'linux',
        fullscreen: false,
        fullscreenable: false,
        resizable: false,
        width: width,
        height: height,
        title: message.conference_alias,
        frame: false,
        show: false,
        // alwaysOnTop: true,
        icon: path.join(__dirname, '..', 'configuration', 'favicon.png'),
    });

    notificationWindow.openDevTools();

    notificationWindow.on('close', function() {
        delete notificationWindows[message.token];
    });

    notificationWindow.webContents.once('dom-ready', function() {
        notificationWindow.webContents.send('message', message);
        var electronScreen = require('screen');
        var defaultSize = electronScreen.getPrimaryDisplay().workAreaSize;
        notificationWindow.setPosition(defaultSize.width - 365, 15);
        notificationWindow.show();
        notificationWindow.focus();
        notificationWindow.setAlwaysOnTop(true);
    });

    notificationWindow.loadURL('file://' + __dirname + '/../desktop-client/index.notification.html');

    notificationWindows[message.token] = notificationWindow;
}

module.exports.open = openIncomingCallWindow;

module.exports.close = function(message) {
    var notificationWindow = notificationWindows[message.token];
    if (notificationWindow) {
        notificationWindow.close();
    }
}
