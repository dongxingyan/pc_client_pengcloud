'use strict';

var fs = require('fs');

angular.module('pexapp')

.factory('imgService', function($q) {

    return {
        load: function(file) {
            var d = $q.defer();
            var img = new Image();
            img.src = file;
            img.onload = function() {
                d.resolve(img);
            };
            return d.promise;
        },
        compose: function(bgFile, fgFile, destFile) {
            return $q.all([this.load(bgFile), this.load(fgFile)])
                .then(function(imgs) {
                    var canvas = document.createElement('canvas');
                    canvas.height = canvas.width = '16';
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(imgs[0], 0, 0, canvas.width, canvas.height);
                    ctx.drawImage(imgs[1], 0, 0, canvas.width, canvas.height);
                    return canvas.toDataURL('image/png');
                })
                .then(function(dataURL) {
                    var data = dataURL.replace(/^data:image\/\w+;base64,/, '');
                    fs.writeFile(destFile, new Buffer(data, 'base64'));
                    return destFile;
                });
        }
    };
});
