'use strict';

var path = require('path');
var remote = require('electron').remote;
var tray = remote.require('./tray-node.js');

angular.module('pexapp')

.run(function($rootScope, $q, $translate, imgService) {
    var trayIconDefault = path.join(__dirname, '..', 'configuration', 'favicon.png');

    var loadGreenImg = imgService.compose(
        trayIconDefault,
        'configuration/green.svg',
        path.join(remote.app.getPath('appData'), 'tray-green.png'));

    var loadRedImg = imgService.compose(
        trayIconDefault,
        'configuration/red.svg',
        path.join(remote.app.getPath('appData'), 'tray-red.png'));

    $rootScope.$on('pex::onRegistered', function() {
        loadGreenImg.then(tray.setImage);
    });
    $rootScope.$on('pex::onUnregistered', function() {
        tray.setImage(trayIconDefault);
    });
    $rootScope.$on('pex::onRegistrationError', function() {
        loadRedImg.then(tray.setImage);
    });

    $rootScope.$on('$translateChangeSuccess', function() {
        $translate([
                'IDS_DESKTOPCLIENT_MENU_OPEN',
                'IDS_DESKTOPCLIENT_MENU_QUIT',
                'IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS'
            ])
            .then(function(ids) {
                tray.create(trayIconDefault, ids);
            });
    });
});
