/**
 * Created by Administrator on 2017/8/4.
 */
'use strict';
/* global nw */

angular.module('pexapp')

    .factory('callWindowService', function($rootScope, $log, $q, $localStorage,mainWindowService) {
        var callWindow;
        var messageDeferreds = {};

        window.addEventListener('message', function(event) {
            $log.log('Got window message', event.data);
            var deferred = messageDeferreds[event.data.id];
            if (deferred) {
                if (event.data.result) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
            }
        });

        function closeCallWindow() {
            var deferred = $q.defer();
            if (callWindow) {
                callWindow.once('closed', deferred.resolve);
                callWindow.close();
            } else {
                $log.log('callWindowService: no window to close')
                deferred.resolve();
            }
            return deferred.promise;
        }

        function openCallWindow(alias, displayName) {
            var closePromise;
            if (callWindow) {
                $log.log('Sending window message');
                $log.log('Sending window message');
                var id = Date.now();
                messageDeferreds[id] = $q.defer();
                callWindow.window.postMessage({
                    id: id,
                    type: 'open-new',
                }, '*');
                closePromise = messageDeferreds[id].promise.then(closeCallWindow);
                callWindow.show();
                callWindow.focus();
            } else {
                closePromise = closeCallWindow();
            }
            closePromise.then(function() {
                var title =  nw.App.manifest.name;
                alias = '&conference=' + encodeURIComponent(alias);
                displayName = displayName ? '&name=' + encodeURIComponent(displayName) : '';
                var url = 'desktop-client/index.textInput.html' ;
                $log.log('openCallWindow', url);
                nw.Window.open(
                    url,
                    {
                        id: 'callWindow',
                        title: title,
                        show: false,
                        // toolbar: false,
                        // frame: true,
                        width: 900,
                        height: 525,
                        min_width: 900,
                        max_width: 900,
                        min_height: 525,
                        max_height: 525,
                        position: 'center',
                        icon: 'configuration/favicon.png',
                        focus: true
                    }, function(win) {
                        callWindow = win;
                        callWindow.once('document-end', function() {
                            callWindow.title = title;
                            callWindow.window.onbeforeunload = null;
                            if ($localStorage.autoFullscreen) {
                                callWindow.enterFullscreen();
                            }
                            callWindow.show();
                            callWindow.focus();
                            global.isCallWindowOpen = true;
                        });
                        callWindow.once('closed', function() {
                            $log.log('callWindow closed');
                            callWindow = null;
                            delete global.isCallWindowOpen;

                            nw.Window.open(
                                'desktop-client/index.main.html', {
                                    id: 'mainWindow'
                                })
                        });
                        callWindow.on('new-win-policy', function(frame, url, policy) {
                            nw.Shell.openExternal(url);
                            policy.ignore();
                        });
                    });
            });
        }

        $rootScope.$on('pex::callAccept', function(event, message) {
            $log.log('conferenceWindowService.on callAccept', message);
            openConferenceWindow(
                message.host,
                message.conference_alias,
                undefined,
                undefined,
                message.token,
                message.remote_alias,
                true,
                false,
                false);
        });

        return {
            openCallWindow: openCallWindow,
            close: closeCallWindow,
            getWindow: function() {
                return callWindow;
            }
        };
    });
