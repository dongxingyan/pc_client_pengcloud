/* global nw */

(function() {
    'use strict';

    if (!global.logger) {
        var _console = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug,
        };

        var re = /([^/\s(]+:[:|\d]+)/g;

        var getTrace = function() {
            var stack = new Error().stack,
                result;
            while ((result = re.exec(stack)) !== null) {
                if (!result[1].match('logger\.js|angular\.min\.js')) {
                    re.lastIndex = 0;
                    return result[1];
                }
            }
        };

        var formatArguments = function(args) {
            // return JSON.stringify(Array.prototype.slice.call(args), null, '\t');
            return JSON.stringify(Array.prototype.slice.call(args));
        };

        var logFilename = process.env.PEXIP_CONNECT_LOGFILE || nw.App.dataPath + '/application.log';
        var winston = require('winston');

        winston.remove(winston.transports.Console);

        winston.add(winston.transports.File, {
            filename: logFilename,
            tailable: true,
            maxsize: 1e6,
            maxFiles: 3,
            json: false,
            level: 'debug',
            timestamp: function() {
                return new Date().toISOString();
            },
            formatter: function(options) {
                return options.timestamp() + ' ' + options.meta.trace + ' ' + options.level.toUpperCase() + ': ' + options.message;
            }
        });

        global.logger = {
            log: function() {
                var trace = getTrace();
                _console.log.call(console, '(' + trace + ')\n', ...arguments);
                winston.info(formatArguments(arguments), {trace: trace});
            },
            info: function() {
                var trace = getTrace();
                _console.info.call(console, '(' + trace + ')\n', ...arguments);
                winston.info(formatArguments(arguments), {trace: trace});
            },
            warn: function() {
                var trace = getTrace();
                _console.warn.call(console, '(' + trace + ')\n', ...arguments);
                winston.warn(formatArguments(arguments), {trace: trace});
            },
            error: function() {
                var trace = getTrace();
                _console.error.call(console, '(' + trace + ')\n', ...arguments);
                winston.error(formatArguments(arguments), {trace: trace});
            },
            debug: function() {
                var trace = getTrace();
                _console.debug.call(console, '(' + trace + ')\n', ...arguments);
                winston.debug(formatArguments(arguments), {trace: trace});
            },
        };

        // global.logger = {
        //     log: function() {
        //         _console.log.call(console, getTrace() + formatArguments(arguments));
        //     },
        //     info: function() {
        //         _console.info.call(console, getTrace() + formatArguments(arguments));
        //     },
        //     warn: function() {
        //         _console.warn.call(console, getTrace() + formatArguments(arguments));
        //     },
        //     error: function() {
        //         _console.error.call(console, getTrace() + formatArguments(arguments));
        //     },
        //     debug: function() {
        //         _console.debug.call(console, getTrace() + formatArguments(arguments));
        //     },
        // };
    }

    console.log = global.logger.log;
    console.info = global.logger.info;
    console.warn = global.logger.warn;
    console.error = global.logger.error;
    console.debug = global.logger.debug;
})();
