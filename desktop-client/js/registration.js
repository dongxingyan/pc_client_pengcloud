'use strict';

angular.module('pexapp')

.factory('registrationService', function($rootScope, $log, $localStorage, $timeout, regPwdService) {
    $timeout(function () {
        delete $localStorage.registrationState;
        delete $localStorage.registrationError;
        delete $localStorage.registrationToken;
        delete $localStorage.isDirectoryEnabled;
        delete $localStorage.loginState;
    });

    var registrationState,
        registrationPassword;

    var registrationHost = $localStorage.registrationHost;
    var registrationAlias = $localStorage.registrationAlias;
    var registrationUsername = $localStorage.registrationUsername;

    try {
        registrationPassword = regPwdService.load();
    } catch (e) {
        $log.error('Failed to load registration password', e);
    }

    var registrationEventSource,
        registrationTokenRefreshInterval;

    var requestTimeout = 5 * 1000;

    var registrationReconnect = false,
        registrationReconnectTimeout = null,
        registrationReconnectInitialDelay = 1000,
        registrationReconnectMaxDelay = 40000,
        registrationReconnectDelay = registrationReconnectInitialDelay;

    function resetRegistrationReconnect() {
        registrationReconnect = false;
        window.clearTimeout(registrationReconnectTimeout);
        registrationReconnectTimeout = null;
        registrationReconnectDelay = registrationReconnectInitialDelay;
    }
    resetRegistrationReconnect();

    function onRegistered() {
        $timeout(function() {
            $log.log('onRegistered');
            resetRegistrationReconnect();
            registrationReconnect = true;
            $localStorage.registrationState = 'ACTIVE';
            $rootScope.$emit('pex::onRegistered');
            $localStorage.loginState = true;

        });
    }

    function onUnregistered() {
        $timeout(function() {
            $log.log('onUnregistered');
            delete $localStorage.registrationError;
            delete $localStorage.registrationToken;
            $localStorage.isDirectoryEnabled = false;
            $localStorage.registrationState = 'UNREGISTERED';
            $localStorage.loginState = false;
            $rootScope.$emit('pex::onUnregistered');
        });
    }

    function onRegistrationError(event) {
        $timeout(function() {
            $log.error('onRegistrationError', event);
            unregister(function() {
                $localStorage.registrationState = 'FAILED';
                $localStorage.loginState = false;
                $rootScope.$emit('pex::onRegistrationError');
                if (registrationReconnect) {
                    $log.log('registration reconnect attempt in ' + (registrationReconnectDelay / 1000) + ' seconds');
                    window.clearTimeout(registrationReconnectTimeout);
                    // registrationReconnectTimeout = window.setTimeout(function() {
                    //     register();
                    // }, registrationReconnectDelay);
                    registrationReconnectDelay *= 2;
                    registrationReconnectDelay = Math.min(registrationReconnectDelay, registrationReconnectMaxDelay);
                } else {
                    $localStorage.registrationError = {
                        status: '' + event
                    };
                }
            });
        });
    }

    function encodeUtf8(str) {
        return window.unescape(encodeURIComponent(str));
    }

    function prepareRequest(method, url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.timeout = requestTimeout;
        if (callback) {
            xhr.onload = function(e) {
                if (e.target.status === 200) {
                    try {
                        callback(null, JSON.parse(e.target.responseText));
                    } catch (err) {
                        callback(err);
                    }
                } else {
                    callback(e);
                }
            };

            xhr.onerror = function(event) {
                callback(event);
            };
            xhr.ontimeout = function(event) {
                callback(url + ' timed out');
            };
        }

        xhr.open(method, url);
        return xhr;
    }

    function requestToken(host, alias, username, password, callback) {
        var xhr = prepareRequest(
            'post', [
                'https:/', host, 'api/client/v2/registrations', encodeURIComponent(alias),
                'request_token'
            ].join('/'),
            callback);
        xhr.setRequestHeader('Authorization',
            'x-pexip-basic ' + window.btoa(encodeUtf8(username + ':' + password)));
        xhr.setRequestHeader('X-Pexip-Authorization',
            'x-pexip-basic ' + window.btoa(encodeUtf8(username + ':' + password)));
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify({}));
    }

    function refreshToken(host, alias, token, callback) {
        var xhr = prepareRequest(
            'post', [
                'https:/', host, 'api/client/v2/registrations', encodeURIComponent(alias),
                'refresh_token'
            ].join('/'),
            callback);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(JSON.stringify({
            'token': token
        }));
    }

    function releaseToken(host, alias, token, callback) {
        if (token) {
            var xhr = prepareRequest(
                'post',
                'https://' + host + '/api/client/v2/registrations/' + encodeURIComponent(alias) + '/release_token?token=' + token,
                callback);
            xhr.send();
        } else {
            callback();
        }
    }

    $rootScope.$on('pex::callReject', function(event, message) {
        $log.log('registrationService.on callReject', message);
        var xhr = prepareRequest(
            'post',
            'https://' + registrationHost + '/api/client/v2/conferences/' + encodeURIComponent(message.conference_alias) + '/release_token?token=' + message.token);
        xhr.send();
    });

    function register() {
        $log.log('register');
        // if (registrationHost && registrationAlias) {
        delete $localStorage.registrationError;
        $localStorage.registrationState = 'REGISTERING';
        var record = '_pexapp._tcp.' + registrationHost;

        const dns = require('dns');
        $log.debug('dns servers', dns.getServers())
        dns.resolveSrv(record, function(error, addresses)  {
            $log.debug('Using name servers');
            var vmrDetails;
            if (!error && addresses[0]) {
                $log.log('Resolved', record, addresses);
                registrationHost = addresses[0].name;
            } else {
                $log.error('Unable to resolve', record, 'Falling back to', registrationHost);
            }
            requestToken(
                registrationHost,
                registrationAlias,
                registrationUsername,
                registrationPassword,
                function(err, response) {
                    if (err) {
                        $log.error('requestToken failed', response);
                        onRegistrationError(err);
                    } else {
                        $localStorage.registrationToken = response.result.token;
                        $localStorage.isDirectoryEnabled = response.result.directory_enabled;
                        registrationEventSource = new window.EventSource('https://' + registrationHost + '/api/client/v2/registrations/' + encodeURIComponent(registrationAlias) + '/events?token=' + $localStorage.registrationToken);

                        registrationEventSource.addEventListener('incoming_cancelled', function(e) {
                            $rootScope.$apply(function() {
                                var msg = JSON.parse(e.data);
                                msg.host = registrationHost;
                                $log.log('registrationEventSource incoming_cancelled', msg);
                                $rootScope.$emit('pex::onIncomingCallCancelled', msg);
                            });
                        });

                        registrationEventSource.addEventListener('incoming', function(e) {
                            $rootScope.$apply(function() {
                                var msg = JSON.parse(e.data);
                                msg.host = registrationHost;
                                $log.log('registrationEventSource incoming', msg);
                                $rootScope.$emit('pex::onIncomingCall', msg);
                            });
                        });

                        var eventSourceTimeout = window.setTimeout(function() {
                            registrationEventSource.onerror('EventSource.open timeout');
                        }, requestTimeout);

                        registrationEventSource.onopen = function(e) {
                            $log.log('registrationEventSource.onopen', e);
                            registrationEventSource.onopen = undefined;
                            window.clearTimeout(eventSourceTimeout);
                            registrationTokenRefreshInterval = window.setInterval(function() {
                                refreshToken(registrationHost, registrationAlias, $localStorage.registrationToken, function(err, response) {
                                    if (err) {
                                        $log.error('refreshToken failed', err);
                                        onRegistrationError(err);
                                    } else {
                                        // $log.log('registration refreshToken succeeded', response)
                                        $localStorage.registrationToken = response.result.token;
                                    }
                                });
                            }, (response.result.expires || 120) * 1000 / 3);

                            onRegistered();
                        };

                        registrationEventSource.onerror = function(event) {
                            window.clearTimeout(eventSourceTimeout);
                            onRegistrationError(event);
                        };
                    }
                });
        });
/*        var cp = require('child_process');
        var childPath = 'desktop-client/js/dns.js';
        var childProcess = cp.fork(childPath);
        childProcess.on('message', function(result) {*/
            /*childProcess.disconnect();
            var error = result.error;
            var addresses = result.addresses;
            $log.debug('Using name servers', result.nameServers);
            var vmrDetails;
            if (!error && addresses[0]) {
                $log.log('Resolved', record, addresses);
                registrationHost = addresses[0].name;
            } else {
                $log.error('Unable to resolve', record, 'Falling back to', registrationHost);
            }

            requestToken(
                registrationHost,
                registrationAlias,
                registrationUsername,
                registrationPassword,
                function(err, response) {
                    if (err) {
                        $log.error('requestToken failed', response);
                        onRegistrationError(err);
                    } else {
                        $localStorage.registrationToken = response.result.token;
                        $localStorage.isDirectoryEnabled = response.result.directory_enabled;
                        registrationEventSource = new window.EventSource('https://' + registrationHost + '/api/client/v2/registrations/' + encodeURIComponent(registrationAlias) + '/events?token=' + $localStorage.registrationToken);

                        registrationEventSource.addEventListener('incoming_cancelled', function(e) {
                            $rootScope.$apply(function() {
                                var msg = JSON.parse(e.data);
                                msg.host = registrationHost;
                                $log.log('registrationEventSource incoming_cancelled', msg);
                                $rootScope.$emit('pex::onIncomingCallCancelled', msg);
                            });
                        });

                        registrationEventSource.addEventListener('incoming', function(e) {
                            $rootScope.$apply(function() {
                                var msg = JSON.parse(e.data);
                                msg.host = registrationHost;
                                $log.log('registrationEventSource incoming', msg);
                                $rootScope.$emit('pex::onIncomingCall', msg);
                            });
                        });

                        var eventSourceTimeout = window.setTimeout(function() {
                            registrationEventSource.onerror('EventSource.open timeout');
                        }, requestTimeout);

                        registrationEventSource.onopen = function(e) {
                            $log.log('registrationEventSource.onopen', e);
                            registrationEventSource.onopen = undefined;
                            window.clearTimeout(eventSourceTimeout);
                            registrationTokenRefreshInterval = window.setInterval(function() {
                                refreshToken(registrationHost, registrationAlias, $localStorage.registrationToken, function(err, response) {
                                    if (err) {
                                        $log.error('refreshToken failed', err);
                                        onRegistrationError(err);
                                    } else {
                                        // $log.log('registration refreshToken succeeded', response)
                                        $localStorage.registrationToken = response.result.token;
                                    }
                                });
                            }, (response.result.expires || 120) * 1000 / 3);

                            onRegistered();
                        };

                        registrationEventSource.onerror = function(event) {
                            window.clearTimeout(eventSourceTimeout);
                            onRegistrationError(event);
                        };
                    }
                });*/
        // });
        // childProcess.send({
        //     record: record
        // });
        // }
    }

    function unregister(callback) {
        $log.log('unregister');
        $localStorage.registrationState = 'UNREGISTERING';

        if (registrationEventSource) {
            registrationEventSource.close();
            registrationEventSource = null;
        }
        if (registrationTokenRefreshInterval) {
            window.clearInterval(registrationTokenRefreshInterval);
            registrationTokenRefreshInterval = null;
        }
        releaseToken(registrationHost, registrationAlias, $localStorage.registrationToken, function(err, result) {
            onUnregistered();
            if (callback) {
                $timeout(function() {
                    callback();
                });
            }
        });
    }

    if (registrationHost && registrationAlias) {

        if ($localStorage.loginState == true) {
           register();
        }else {

        }
    }

    var service = {
        register: function(host, alias, username, password, callback, storePassword) {
            $timeout(function() {
                $log.log('registrationService.register', host, alias, username);
                registrationHost = host;
                registrationAlias = alias;
                registrationUsername = username;
                registrationPassword = password;
                regPwdService.save(storePassword ? password : '');
                service.unregister(function() {
                    register();
                });
            });
        },
        unregister: function(callback) {
            $timeout(function() {
                $log.log('registrationService.unregister');
                resetRegistrationReconnect();
                unregister(callback);
            });
        }
    };

    return service;
});
