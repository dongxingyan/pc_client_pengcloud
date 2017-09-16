'use strict';
/* global nw */

angular.module('pexapp')

.factory('mainWindowService', function($q, $log,trayService) {
    var mainWindow;
    var width = 360;
    var height = 610;

    if (navigator.userAgent.indexOf('Macintosh') > -1) {
        height = 640;
    }
    return {
        open: function(callback) {
            callback = callback || angular.noop;
            if (!mainWindow) {
                $log.log('mainWindowService.open(): creating window');
                nw.Window.open(
                    'desktop-client/index.main.html', {
                    //     'desktop-client/login.html',{
                        id: 'mainWindow',
                        title: nw.App.manifest.name,
                        show: false,
                        // toolbar: true,
                        frame: true,
                        width: width,
                        height: height,
                        min_width: width,
                        max_width: width,
                        min_height: height,
                        max_height: height,
                        position: 'center',
                        icon: 'configuration/favicon.png',
                        focus: true,
                    }, function(win) {
                        mainWindow = win;
                        mainWindow.once('document-end', function() {
                            $log.log('mainWindowService: document-end');
                            mainWindow.title = nw.App.manifest.name;
                            mainWindow.window.onbeforeunload = null;
                            mainWindow.show();
                            mainWindow.focus();
                            callback();
                        });
                        mainWindow.on('close',function(){
                            mainWindow.hide();
                        });
                        mainWindow.once('closed', function() {
                            $log.log('mainWindow closed');
                            mainWindow = null;
                        });

                        mainWindow.on('new-win-policy', function(frame, url, policy) {
                            $log.log('mainWindowService: new-win-policy', frame, url, policy);
                            nw.Shell.openExternal(url);
                            policy.ignore();
                        });
                        mainWindow.on('resize', function(width,height){
                        });
                        mainWindow.on('focus', function(){
                                mainWindow.resizeTo(360,700);
                        });


                    });
            } else {
                $log.log('mainWindowService.open(): showing window');
                mainWindow.focus();
                mainWindow.show();
                callback();
            }
        },
        close: function(type) {
            var deferred = $q.defer();
            if (mainWindow) {
                $log.log('mainWindowService: closing window');
                mainWindow.once('closed', deferred.resolve);
                mainWindow.close(type);
            } else {
                deferred.resolve();
            }
            return deferred.promise;
        },
        show:function(callback){
            callback = callback || angular.noop;
                mainWindow.show();
                mainWindow.focus();
                callback();
        },
        getWindow: function() {
            return mainWindow;
        },
        reload:function () {
            mainWindow.reload();
        }
    };
});
