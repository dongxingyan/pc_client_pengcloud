'use strict';
/* global nw */

angular.module('pexapp')

.factory('trayService', function($rootScope, $q, $translate, path, imgService) {
    var trayIconDefault = 'configuration/favicon.png';

    var loadGreenImg = imgService.compose(
        trayIconDefault,
        'configuration/green.svg',
        path.join(nw.App.dataPath, 'tray-green.png'));

    var loadRedImg = imgService.compose(
        trayIconDefault,
        'configuration/red.svg',
        path.join(nw.App.dataPath, 'tray-red.png'));

    var tray = new nw.Tray({
        icon: trayIconDefault,
        iconsAreTemplates: false,
        tooltip: nw.App.manifest.name
    });

    tray.on('click', function() {
        // $rootScope.$emit('pex::Open');
        $rootScope.$emit('pex::Show');
        // nw.App.show();
    });

    $rootScope.$on('pex::onRegistered', function() {
        loadGreenImg.then(function(path) {
            if (tray) {
                tray.icon = path;
            }
        });
    });
    $rootScope.$on('pex::onUnregistered', function() {
        if (tray) {
            tray.icon = trayIconDefault;
        }
    });
    $rootScope.$on('pex::onRegistrationError', function() {
        loadRedImg.then(function(path) {
            if (tray) {
                tray.icon = path;
            }
        });
    });

    $rootScope.$on('$translateChangeSuccess', function() {
        var menu = new nw.Menu();

        $translate([
                'IDS_DESKTOPCLIENT_MENU_OPEN',
                'IDS_DESKTOPCLIENT_MENU_QUIT',
                // 'IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS'
            ])
            .then(function(ids) {
                menu.append(new nw.MenuItem({
                    type: 'normal',
                    label: ids.IDS_DESKTOPCLIENT_MENU_OPEN,
                    click: function() {
                        $rootScope.$emit('pex::Open');
                    }
                }));

                // menu.append(new nw.MenuItem({
                //     type: 'separator',
                // }));

                // menu.append(new nw.MenuItem({
                //     type: 'normal',
                //     label: ids.IDS_DESKTOPCLIENT_MENU_SHOW_DEV_TOOLS,
                //     click: function() {
                //         nw.Window.get().showDevTools();
                //     }
                // }));

                menu.append(new nw.MenuItem({
                    type: 'separator',
                }));

                menu.append(new nw.MenuItem({
                    type: 'normal',
                    label: ids.IDS_DESKTOPCLIENT_MENU_QUIT,
                    click: function() {
                        $rootScope.$emit('pex::Quit');
                    }
                }));

                tray.menu = menu;
            });
    });

    return {
        tray:tray,
        remove: function() {
            tray.remove();
            tray = null;
        }
    };
});
