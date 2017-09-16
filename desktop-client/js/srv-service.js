/* global $*/

angular.module('pexapp')

.factory('srvService', function($q, $log, $localStorage, applicationSettings) {
    'use strict';
    var ipRe = /^\d+\.\d+\.\d+\.\d+$/;
    function getPexappAddresses(domain, verbatimFallback) {
        var serversDeferred = $q.defer();
        if (domain && domain.match(ipRe)) {
            // If domain is an ip address, return it as the address
            $log.debug('getPexappAddresses domainis ');
            serversDeferred.resolve([domain]);
        }
        else if (domain) {

            var record = '_pexapp._tcp.' + domain;
            $log.debug('getPexappAddresses domain have data', domain);
            const dns = require('dns');
            // const dns = new Resolver()
            // dns.setServers(['8.8.8.8'])


            $log.debug('dns servers', dns.getServers())
            $log.debug('dns record', record)


            dns.resolveSrv(record, function(error, addresses)  {
                $log.debug('Using name servers');

                if (error) {
                    $log.debug('Unable to resolve', record);
                    if (verbatimFallback) {
                        $log.debug('Falling back to', domain);

                        serversDeferred.resolve([domain]);
                    } else {
                        serversDeferred.resolve([]);
                    }
                } else {
                    $log.debug('Resolved', record, addresses);
                    // Sort addresses by priority
                    addresses.sort(function(a, b) {
                        return a.priority > b.priority ? 1 : -1;
                    });
                    serversDeferred.resolve(
                        // Return only the addresses with their ports
                        addresses.reduce(function(domains, address,index, arr) {
                            domains.push(address.name + ':' + address.port);
                            return domains;
                        }, [])
                    );
                }
            })

/*
            var cp = require('child_process');
            var childPath = 'desktop-client/js/dns.js';
            var childProcess = cp.fork(childPath);
            childProcess.on('message', function(result) {
                childProcess.disconnect();
                var error = result.error;
                var addresses = result.addresses;
                $log.debug('Using name servers', result.nameServers);

                if (error) {
                    $log.debug('Unable to resolve', record);
                    if (verbatimFallback) {
                        $log.debug('Falling back to', domain);
                        serversDeferred.resolve([domain]);
                    } else {
                        serversDeferred.resolve([]);
                    }
                } else {
                    $log.debug('Resolved', record, addresses);
                    // Sort addresses by priority
                    addresses.sort(function(a, b) {
                        return a.priority > b.priority ? 1 : -1;
                    });
                    serversDeferred.resolve(

                        // Return only the addresses with their ports
                        addresses.reduce(function(domains, address) {
                            $log.debug('bbbbb');
                            domains.push(address.name + ':' + address.port);
                            return domains;
                        }, [])
                    );
                }
            });
            childProcess.send({record: record});
            */
        } else {

            $log.debug('getPexappAddresses no domain');
            serversDeferred.resolve([]);
        }
        return serversDeferred.promise;
    }

    return {
        getVmrDetails: function(uri) {
            var uriComponents = uri.split('@');
            var servers = [];
            // allow uri SRV lookup to be disabled for test purposes
            if (!$localStorage.skipUriSrv) {

                servers.push(getPexappAddresses(uriComponents[1], false));
            }
            servers.push(
                getPexappAddresses(applicationSettings.serverAddress, true),
                getPexappAddresses($localStorage.serverAddress, true),
                getPexappAddresses($localStorage.registrationHost, true));
            return $q.all(servers).then(function(servers) {
                // FIXME 使用124.204.33.245作为最后一个尝试。124.204.33.245是北京地区的tp.cloudp.cc的域名，这个地址应该写到application的配置文件中
                return [].concat.apply([], servers).concat( [], '124.204.33.245');
            });
        }
    };
});
