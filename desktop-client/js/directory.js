/*global global, $ */

angular.module('pexapp')

.controller('DirectoryController', function($scope, $timeout, $localStorage, $http, $rootScope, platformSettings, srvService) {
    'use strict';

    $scope.directoryPending = false;
    $scope.directoryResults = [];

    var directory_timeout;
    var registrationHost;

    $scope.getDirectory = function(query) {
        if (!$localStorage.isDirectoryEnabled) {
            $scope.directoryResults = [];
            return;
        }
        if (directory_timeout) { //if there is already a timeout in process cancel it
            $timeout.cancel(directory_timeout);
        }
        if (!registrationHost && $localStorage.registrationHost) {
            srvService.getVmrDetails($localStorage.registrationHost).then(function(servers) {
                servers = $.unique(servers.filter(function(value) {
                    return !!value;
                }));
                registrationHost = servers[0];
                $timeout(function() {
                    $scope.getDirectory(query);
                });
            });
            return;
        }
        directory_timeout = $timeout(function() {
            directory_timeout = null;
            if (!query) {
                query = '';
            }
            $scope.directoryPending = true;
            var q = $http.get('https://' + registrationHost + '/api/client/v2/registrations?q=' +
                encodeURIComponent(query), {
                    headers: {
                        token: $rootScope.globalService.getToken()
                    }
                });
            q.then(function(results) {
                $scope.directoryPending = false;
                var result = results.data.result;
                angular.forEach(result, function(item) {
                    item.avatarUrl = 'https://' + registrationHost + '/api/client/v2/registrations/' + item.alias + '/avatar.jpg?token=' + $rootScope.globalService.getToken();
                });
                $scope.directoryResults = result;
            }, function(error) {
                console.error(error);
                $scope.directoryPending = false;
                $scope.directoryResults = [];
            });
        }, 500);
    };

    $rootScope.directory = {
        getDirectory: $scope.getDirectory
    };

    if ($localStorage.registrationToken && platformSettings.isDesktopClient) {
        $scope.$watch(function() {
            return $localStorage.isDirectoryEnabled;
        }, function(oldvalue, newvalue) {
            $scope.getDirectory($scope.params.conference);
        });
    }
});
