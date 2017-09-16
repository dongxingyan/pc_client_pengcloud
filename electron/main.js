/* jshint node: true, esversion: 6 */

var app = require('app');

// var ipcMain = require('electron').ipcMain;
// var path = require('path');

var BrowserWindow = require('browser-window');

var backgroundWindow = require('./background-window.js');
var mainWindow = require('./main-window.js');
var conferenceWindow = require('./conference-window.js');

app.on('ready', function() {
    backgroundWindow.open();
    mainWindow.open();

});


global.globalService = {
    join: function(alias, displayName, pin, token, media, audioonly) {
        console.log('join', arguments)
        conferenceWindow.open(undefined, alias, displayName, token, undefined, media, audioonly);
    },
    register: backgroundWindow.register,
    unregister: backgroundWindow.unregister,
    callAccept: backgroundWindow.callAccept,
    callReject: backgroundWindow.callReject,
}
