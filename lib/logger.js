'use strict';

var logu = require('logu');

function createLog(host, options) {
  if (typeof host === 'object') {
    options = host;
    host = null;
  }
  options = options || {};
  host = options.host = host || options.host || 'dialy';
  options.level = options.level || 'info';
  options.transports = [
    new logu.transports.Console({
      sizes: {
        id: 13
      }
    })
  ];

  var logger = new logu.Logger(options);

  logger.on('logged', function (log) {
    if (log.level === 'error' && logger.exitOnError) {
      process.exit(1);
    }
  });

  logger.cli(host, {timestamp: 'short', showLevel: false, showLabel: false});

  return logger;
}

module.exports.log = createLog({level: 'debug'});
module.exports.createLog = createLog;
