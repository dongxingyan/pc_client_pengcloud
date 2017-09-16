'use strict';
/* global nw */

angular.module('pexapp')

.run(function($rootScope, $q, $log, $localStorage, callHistory) {
    nw.Screen.Init();
    var incomingCalls = {};
    var width = 350;
    var height = process.platform === 'linux' ? 56 : 60;

    function openIncomingCallWindow(message) {
        $log.log('openIncomingCallWindow()');
        incomingCalls[message.token] = nw.Window.open(
            'desktop-client/index.notification.html', {
                title: process.platform === 'darwin' ? '' : message.conference_alias,
                show: false,
                // show_in_taskbar: process.platform === 'darwin',
                visible_on_all_workspaces: true,
                transparent: process.platform !== 'linux',
                // toolbar: false,
                frame: false,
                resizable: false,
                width: width,
                height: height,
                // min_width: width,
                // min_height: height,
                // max_width: width,
                // max_height: height,
                focus: true,
                icon: 'configuration/favicon.png',
                always_on_top: true
            },
            function(win) {
                var notificationWindow = win;
                notificationWindow.once('loaded', function() {
                    notificationWindow.window.postMessage({
                        message: message
                    }, '*');

                    var workArea = nw.Screen.screens[0].work_area;
                    var x = workArea.x + workArea.width - width - 20;
                    var y = workArea.y + 20;
                    if (process.platform === 'win32') {
                        y = workArea.y + workArea.height - height - 20;
                    }

                    notificationWindow.moveTo(x, y);
                    notificationWindow.show();
                    notificationWindow.focus();
                    notificationWindow.setAlwaysOnTop(true);
                });

                notificationWindow.on('close', function() {
                    delete incomingCalls[message.token];
                    notificationWindow.close(true);
                    notificationWindow = null;
                });

                incomingCalls[message.token] = {
                    notificationWindow: notificationWindow,
                    message: message
                };
            });

    }

    $rootScope.$on('pex::onIncomingCall', function(event, message) {
        $log.log('pex::onIncomingCall');
        if ($localStorage.autoAnswer) {
            $rootScope.$emit('pex::callAccept', message);
            return;
        }
        openIncomingCallWindow(message);
    });

    $rootScope.$on('pex::callAccept', function(event, message) {
        $log.log('pex::callAccept');
        var incomingCall = incomingCalls[message.token];
        if (incomingCall) {
            incomingCall.notificationWindow.close();
        }
    });

    $rootScope.$on('pex::onIncomingCallCancelled', function(event, message) {
        $log.log('pex::onIncomingCallCancelled');
        var incomingCall = incomingCalls[message.token];
        if (incomingCall) {
            callHistory.add(
                incomingCall.message.remote_alias,
                'https://' + incomingCall.message.host + '/api/client/v2/conferences/' + incomingCall.message.remote_alias + '/avatar.jpg',
                'missed');
            incomingCall.notificationWindow.close();
        }
    });

    $rootScope.$on('pex::callReject', function(event, message) {
        $log.log('incomingCallWindow.on callReject', message);
        var incomingCall = incomingCalls[message.token];
        if (incomingCall) {
            incomingCall.notificationWindow.close();
            if (incomingCall) {
                callHistory.add(
                    incomingCall.message.remote_alias,
                    'https://' + incomingCall.message.host + '/api/client/v2/conferences/' + incomingCall.message.remote_alias + '/avatar.jpg',
                    'missed');
                incomingCall.notificationWindow.close();
            }
        }
    });
});
