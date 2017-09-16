'use strict';
/* global nw, URL, URLSearchParams */

angular.module('pexapp')

.constant('path', require('path'))

.factory('globalService', function($rootScope, $timeout, $localStorage, registrationService, mainWindowService, conferenceWindowService,callWindowService) {
    global.globalService = {};
    global.globalService.VERSION_STRING = global.VERSION_STRING;
    global.globalService.ifNull;
    console.log('Version: ', global.VERSION_STRING);

    global.globalService.register = function(host, uri, userName, password, callback, storePassword) {
        if (uri) {
            global.globalService.ifNull=false;
            var uriComponents = uri.split('@');
            // if (!userName) {
                userName = $localStorage.registrationUsername = uriComponents[0];
            // }
            if (!host && uriComponents[1]) {
                host = $localStorage.registrationHost = uriComponents[1];
            }
        }
        else if(!uri){
            global.globalService.ifNull=true;
            return false;
        }
        global.globalService.ifNull=false;
        console.log('global.register', host, uri, userName, password, callback, storePassword);
        return registrationService.register.apply(this, [host, uri, userName, password, callback, storePassword]);
    };
    global.globalService.unregister = function() {
        console.log('global.unregister', arguments);
        return registrationService.unregister.apply(this, arguments);
    };
    global.globalService.callReject = function(message) {
        console.log('global.callReject', message);
        $rootScope.$emit('pex::callReject', message);
    };
    global.globalService.callAccept = function(message) {
        $rootScope.$emit('pex::callAccept', message);
    };

    global.globalService.join = function(alias, displayName, pin, token, media, audioonly, escalate) {
        console.log('global.join', alias, displayName, pin, token, media, audioonly);
        // mainWindowService.close();
        conferenceWindowService.openConferenceWindow(
            undefined,
            alias,
            displayName,
            pin,
            token,
            undefined,
            media,
            audioonly,
            escalate);
    };

    global.globalService.enter = function(alias, displayName) {
        // mainWindowService.close();
        callWindowService.openCallWindow(
            undefined,
            alias,
            displayName);
    };



    global.globalService.getToken = function() {
        return $localStorage.registrationToken;
    };
    global.globalService.reset = function() {
        mainWindowService.close(true).then(function(){
        global.globalService.unregister(function() {
            $localStorage.$reset({
                callHistory: $localStorage.callHistory
            });
        });
            mainWindowService.open();
        });
        // .then(function() {
        //     global.globalService.unregister(function() {
        //         $localStorage.$reset({
        //             callHistory: $localStorage.callHistory
        //         });
        //         mainWindowService.reload();
        //         // mainWindowService.show();
        //     });
        // });
    };

    global.globalService.setProvisionData = function(data) {
        $localStorage.provisionData = data;
    };
    global.globalService.applyProvisionData = function(data) {
        console.log('Applying provisioning data', data);
        $timeout(function() {
            if (data.name) {
                $localStorage.name = data.name;
            }

            if (data.registrationAlias) {
                $localStorage.registrationHost = data.registrationHost;
                $localStorage.registrationAlias = data.registrationAlias;
                $localStorage.registrationUsername = data.registrationUsername;
                $localStorage.registrationPassword = data.registrationPassword;

                global.globalService.register(
                    data.registrationHost,
                    data.registrationAlias,
                    data.registrationUsername,
                    data.registrationPassword,
                    null,
                    true
                );
            }
        });
    };

    // global.openMainWindow and quit is only used for selenium tests and should not be needed internally
    global.openMainWindow = function(callback) {
        $rootScope.$emit('pex::Open', callback);
    };
    global.quit = function() {
        $rootScope.$emit('pex::Quit');
    };

    return global.globalService;
})

.run(function($rootScope, $timeout, $log, $q, $localStorage, trayService, registrationService, mainWindowService, conferenceWindowService,callWindowService) {
    function getConferenceUri(argv) {
        return argv
            .filter(arg => arg.startsWith('pexip:'))
            .map(arg => new URL(arg))
            .pop();
    }

    $timeout(() => delete $localStorage.provisionData);

    function parseProvisionUri(argv) {
        try {
            argv
                .filter(arg => arg.startsWith('pexip-provision:'))
                .map(arg => new URL(arg))
                .map(url => url.searchParams.get('data'))
                .map(data => new URLSearchParams(atob(data)))
                .map(sarchParams => {
                    $timeout(() => {
                        $localStorage.provisionData = {
                            name: sarchParams.get('name'),
                            registrationHost: sarchParams.get('registrationHost'),
                            registrationAlias: sarchParams.get('registrationAlias'),
                            registrationUsername: sarchParams.get('registrationUsername'),
                            registrationPassword: sarchParams.get('registrationPassword'),
                        };
                    });
                });
        } catch (e) {
            $log.warn('Error parsing provisioning uri', e.toString());
        }
    }

    function main(argv) {
        $log.log('main: argv', argv);
        parseProvisionUri(argv);
        var conferenceUri = argv && getConferenceUri(argv);
        if (conferenceUri) {
            let escalate = conferenceUri.searchParams.get('escalate') || $localStorage.promptMedia;
            let media = escalate ? false : conferenceUri.searchParams.get('media') || $localStorage.media;
            global.globalService.join(
                conferenceUri.pathname.replace(/\//g, ''),
                null,
                conferenceUri.searchParams.get('pin'),
                null,
                media,
                conferenceUri.searchParams.get('audioonly'),
                escalate);
        } else if (conferenceWindowService.getWindow()) {
            conferenceWindowService.getWindow().show();
            conferenceWindowService.getWindow().focus();
        } else if (!$localStorage.startMinimized) {
            mainWindowService.open();
        }
    }

    nw.App.on('open', function(cmdline) {
        $log.log('App.on("open")', cmdline);
        var argv = cmdline.split(/\s/);
        main(argv);
    });

    nw.App.on('reopen', function(argv) {
        $log.log('App.on("reopen")', argv);
        main(argv);
    });

    nw.Window.get().once('loaded', function() {
        main(nw.App.argv);
    });

    $rootScope.$on('pex::Quit', function() {
        $log.log('pex::Quit');
        trayService.remove();

        var unregisterDeferred = $q.defer();
        registrationService.unregister(unregisterDeferred.resolve);

        $q.all([
            unregisterDeferred.promise,
            conferenceWindowService.close(),
            // callWindowService.close(),
            mainWindowService.close(),
            nw.App.quit(),
        ]).then(function() {

        });
    });

    $rootScope.$on('pex::Open', function(event, callback) {
        $log.log('pex::Open');
        mainWindowService.open(callback);
    });
    $rootScope.$on('pex::Show', function(event,callback) {
        $log.log('pex::Show');
        mainWindowService.show(callback);
    });

});
