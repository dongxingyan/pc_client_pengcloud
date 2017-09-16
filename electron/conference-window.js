/* jshint node: true, esversion: 6 */


var app = require('app');
var ipcMain = require('electron').ipcMain;
var path = require('path');
var BrowserWindow = require('browser-window');

var conferenceWindow;
var messageDeferreds = {};

module.exports.confirmOpen = function(message) {
    console.log('Confirm open new conference window', message)
    deferred = messageDeferreds[message.id];
    if (deferred) {
        console.log('close deferred', deferred);
        if (message.result) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }
}

function closeConferenceWindow() {
    console.log('closeConferenceWindow');
    return new Promise(function(resolve, reject) {
        if (conferenceWindow) {
            conferenceWindow.once('closed', resolve);
            conferenceWindow.close();
        } else {
            resolve();
        }
    });
}

function openConferenceWindow(host, alias, displayName, token, remoteAlias, media, audioonly, escalate) {
    var title = alias + ' - ' + app.getName();
    host = host ? '&host=' + encodeURIComponent(host) : '';
    alias = '&conference=' + encodeURIComponent(alias);
    displayName = displayName ? '&name=' + encodeURIComponent(displayName) : '';
    token = token ? '&token=' + encodeURIComponent(token) : '';
    remoteAlias = remoteAlias ? '&remote_alias=' + encodeURIComponent(remoteAlias) : '';
    media = media ? '&media=1' : '&media=';
    audioonly = audioonly ? '&audioonly=1' : '&audioonly=';
    escalate = escalate ? '&escalate=1' : '';
    var url = 'file://' + __dirname + '/../desktop-client/index.conference.html#/?join=1' + host + alias + displayName + token + remoteAlias + media + audioonly + escalate;

    console.log('openConferenceWindow', url);

    new Promise(function(resolve, reject) {
            if (conferenceWindow) {
                conferenceWindow.show();
                conferenceWindow.focus();
                // Send window message
                console.log('Sending window message')
                var id = Date.now();
                conferenceWindow.webContents.send('open-new', {
                    id: id
                });
                messageDeferreds[id] = {
                    resolve: resolve,
                    reject: reject
                };
            } else {
                resolve();
            }
        })
        .then(closeConferenceWindow)
        .then(function() {
            if (conferenceWindow) {
                conferenceWindow.close();
            }
            conferenceWindow = new BrowserWindow({
                width: 900,
                height: 650,
                show: false,
                icon: path.join(__dirname, '..', 'configuration', 'favicon.png'),
                title: title,
            });
            conferenceWindow.setMenu(null);
            conferenceWindow.openDevTools();

            conferenceWindow.webContents.once('dom-ready', function() {
                // conferenceWindow.webContents.window.onbeforeunload = null;
                conferenceWindow.show();
                conferenceWindow.focus();
                conferenceWindow.setTitle(title);
            });

            conferenceWindow.on('close', function() {
                console.log()
                conferenceWindow = null;
            });

            conferenceWindow.loadURL(url);
        })

}

module.exports.open = openConferenceWindow;
module.exports.close = closeConferenceWindow;
