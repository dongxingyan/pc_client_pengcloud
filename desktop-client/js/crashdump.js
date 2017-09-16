'use strict';
/* global nw */

angular.module('pexapp')

.factory('crashDumpService', function($log, $q, $http, $localStorage) {
    var fs = require('fs');
    var path = require('path');

    function unlink(filename) {
        var deferred = $q.defer();
        fs.unlink(filename, function(err) {
            if (err) {
                $log.log('Failed to delte', filename, err);
                deferred.reject(err);
            } else {
                $log.log('Delted', filename);
                deferred.resolve(true);
            }
        });
    }

    function loadCrashDumpBlob(filename) {
        return $http.get('file://' + filename, {
                responseType: 'blob'
            })
            .then(function(result) {
                return result.data;
            });
    }

    function uploadCrashDumpBlob(blob) {
        return $http.post($localStorage.incidentReportUrl, {
                ver: nw.App.manifest.version,
                prod: nw.App.manifest.name,
                upload_file_minidump: blob
            }, {
                // Setting ‘Content-Type’: undefined makes the browser set the
                // Content-Type to multipart/form-data for us and fills in the
                // correct boundary.
                headers: {
                    'Content-Type': undefined
                },
                transformRequest: function(data, headersGetter) {
                    var formData = new FormData();
                    angular.forEach(data, function(value, key) {
                        formData.append(key, value);
                    });
                    return formData;
                }
            })
            .then(function(response) {
                return response.data;
            });
    }

    function findAndUploadCrashDumpFiles() {
        var crashDumpDir;
        switch (process.platform) {
            case 'linux':
                crashDumpDir = '/tmp';
                break;
            case 'darwin':
                crashDumpDir = path.join(nw.App.dataPath, '../..', 'Breakpad');
                break;
            case 'win32':
            case 'win64':
                crashDumpDir = path.join(nw.App.dataPath, '..', 'Temp');
                break;
        }
        $log.log('Looking for crash dumps in', crashDumpDir);
        fs.readdir(crashDumpDir, function(err, files) {
            angular.forEach(files || [], function(file) {
                if (file.endsWith('.dmp')) {
                    var filename = path.join(crashDumpDir, file);
                    $log.log('Found crash dump file', filename);
                    loadCrashDumpBlob(filename)
                        .then(uploadCrashDumpBlob)
                        .then(function(result) {
                            $log.log('Successfully uploaded crash dump file', file, result);
                            return unlink(filename);
                        }, function(error) {
                            $log.log('Failed to uploade crash dump file', file, error);
                        });
                }
            });
        });
    }

    return {
        findAndUploadCrashDumpFiles: findAndUploadCrashDumpFiles
    };
})

.run(function($localStorage, crashDumpService) {
    if ($localStorage.incidentReportUrl) {
        crashDumpService.findAndUploadCrashDumpFiles();
    }
});
