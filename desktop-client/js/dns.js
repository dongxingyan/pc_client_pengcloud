'use strict';

const dns = require('dns');
process.on('message', function (message) {
    $log.debug( 'dns incoming',message);
    dns.resolveSrv(message.record, function(error, addresses)  {
        $log.debug( 'dns', record )
        process.send({
            error: error,
            addresses: addresses,
            nameServers: dns.getServers()
        });
    });
});
