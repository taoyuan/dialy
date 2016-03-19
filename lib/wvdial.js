"use strict";

var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var ltusb = require('ltusb');
var proback = require('proback');
var tmpdir = require('os-tmpdir');
var async = require('async');
var Promise = require('bluebird');
var exec = Promise.promisify(require('child_process').exec);

var Tailer = require('./tailer');
var log = require('./logger').log;
var WvDialConf = require('./wvdialconf');

module.exports = WvDial;

/**
 *
 * @param file
 * @param options
 * @returns {WvDial}
 * @constructor
 */
function WvDial(file, options) {
  if (!(this instanceof WvDial)) {
    return new WvDial(file, options);
  }

  if (typeof file === 'object') {
    options = file;
    file = null;
  }

  options = _.merge({
    file: file || '/etc/wvdial.conf',
    provider: {
      phone: '*99#',
      username: '',
      password: ''
    }
  }, options);

  this.conf = new WvDialConf(options.file || '/etc/wvdial.conf');
  this.provider = options.provider;
  this.device = options.device;

  this.wvdialout = path.join(tmpdir(), 'wvdial.out');
  this.wvdialerr = path.join(tmpdir(), 'wvdial.err');
}

util.inherits(WvDial, events.EventEmitter);

Object.defineProperty(WvDial.prototype, 'connected', {
  get: function () {
    return this._connected;
  }
});

WvDial.prototype.setDevice = function (device, cb) {
  if (typeof device === 'function') {
    cb = device;
    device = null;
  }
  if (device) {
    this.device = device;
  }
  device = this.device;

  cb = cb || proback();

  var conf = this.conf;
  ltusb().then(function (usbs) {
    var usb = findUsb(usbs, device);
    if (!usb) {
      throw new Error('Not found device: ' + device);
    }

    return conf.setModem(usb.dev);
  }).asCallback(cb);

  return cb.promise;
};

WvDial.prototype.configure = function (reset, cb) {
  if (typeof reset === 'function') {
    cb = reset;
    reset = null;
  }
  reset = reset || false;
  cb = cb || proback();

  var that = this;
  var conf = this.conf;
  var provider = this.provider;
  var device = this.device;

  log.info('configure', 'configure with reset = %s', reset);

  var promise;
  if (provider) {
    if (reset) {
      promise = Promise.resolve().then(function () {
        log.info('configure', 'Detecting modem and generating `%s` with wvdialconf', conf.file);
        return exec('wvdialconf ' + conf.file);
      }).then(function () {
        log.info('configure', 'Set Provider');
        return conf.setProvider(provider);
      });

      if (provider.apn) {
        promise = promise.then(function () {
          log.info('configure', 'Set APN');
          return conf.set('Init3', util.format('AT+CGDCONT=1,"IP","%s",,0,0', provider.apn));
        });
      }

    } else if (device) {
      promise = conf.setProvider(provider).then(function () {
        log.info('configure', 'Set Modem');
        return that.setDevice(device);
      })
    } else {
      cb(new Error('Device is required'));
    }

  } else {
    cb(new Error('Provider is required'));
  }

  if (promise) {
    promise.then(function () {
      log.info('configure', 'Complete');
      conf.load(cb);
    }).catch(cb);
  }

  return cb.promise;
};

WvDial.prototype.connect = function (cb) {
  cb = cb || proback();

  var that = this;
  var conf = this.conf;

  conf.get('Modem').then(function (modem) {
    if (!modem) {
      throw new Error('Invalid configuration');
    }
    return that._connect();
  }).asCallback(cb);

  return cb.promise;
};

WvDial.prototype._connect = function (retries) {
  retries = retries || 3;
  var conf = this.conf;
  var device = this.device;
  var wvdialerr = this.wvdialerr;
  var wvdialout = this.wvdialout;

  log.info('connect', conf.file);

  var usb;
  var promise = Promise.resolve();
  if (device) {
    promise = promise.then(function () {
      return ltusb().then(function (usbs) {
        usb = findUsb(usbs, device);
        if (usb) {
          log.info('connect', 'Modem:', usb.dev);
        } else {
          throw new Error('Not found device: ' + device);
        }
      });
    });
  }

  var tries = 0;
  var tailer = this._createTailer();

  tailer.on('close', function () {
    exec('pkill wvdial');
  });

  // reset tries
  this.on('connected', function () {
    tries = 0;
  });

  function connect() {

    if (tries > retries || tailer.closed) {
      tailer.close();
      return Promise.reject(new Error('Connect failed.', tailer.lastError));
    } else if (tries) {
      log.info('connect', 'Attempt', tries);
    }

    tries++;

    if (device) {
      return ltusb().then(function (usbs) {
        usb = findUsb(usbs, device);
        if (usb) {
          log.info('connect', 'Set Modem:', usb.dev);
        } else {
          log.error('connect', 'Can not find device:', device);
          // TODO more retry times
          return connect();
        }

        return conf.setModem(usb.dev).then(function () {
          return wvconnect();
        }).catch(function (err) {
          log.error('connect', err);
          return connect();
        })
      }).catch(function () {
        return connect();
      });
    } else {
      return wvconnect();
    }

    function wvconnect() {
      log.info('connect', 'Waiting to kill previous `wvidal` process');
      return execs('pkill wvdial', 'sleep 5', 'modprobe usbserial').finally(function () {
        var cmd = util.format('wvdial Defaults -C %s 1> %s 2> %s', conf.file, wvdialerr, wvdialout);
        log.info('connect', 'Connect with wvdial `%s`', cmd);
        return execs(['sleep 5', cmd]).catch(function () {
          return connect();
        });
      });
    }
  }

  return promise.then(connect);
};

WvDial.prototype._createTailer = function () {
  var wvdialerr = this.wvdialerr;
  var wvdialout = this.wvdialout;
  fs.writeFileSync(wvdialerr, "");
  fs.writeFileSync(wvdialout, "");

  log.debug('tailer', 'tail for', wvdialout);

  var that = this;
  var tailer = new Tailer(wvdialout);
  tailer.on('line', function (line, count) {
    if (count > 200) {
      return tailer.close();
    }

    if (line.split('DNS').length == 2) {
      tailer.lastError = null;
      fs.writeFileSync(wvdialerr, "");
      fs.writeFileSync(wvdialout, "");
      tailer.reset();
      connected();
    }

    if (/disconnect/i.test(line)) {
      disconnected();
    }

    if (/NO CARRIER/i.test(line)) {
      tailer.lastError = new Error('NO CARRIER');
    }
  });

  tailer.on('error', function (err) {
    tailer.lastError = err;
    tailer.close();
  });

  tailer.on('close', function () {
    disconnected();
  });

  function connected() {
    if (that.connected) return;
    log.info('connect', 'PPP connected');
    that._connected = true;
    that.emit('connected');
    that.emit('status', that.connected);
  }

  function disconnected() {
    if (!that.connected) return;
    log.info('connect', 'PPP disconnected');
    that._connected = false;
    that.emit('disconnected', tailer.lastError);
    that.emit('status', that.connected, tailer.lastError);
  }

  return tailer;
};


function findUsb(usbs, device) {
  return _.find(usbs, function (usb) {
    return usb.type === 'serial' && usb.hub === device;
  });
}

function execs() {
  var commands = _.flattenDeep(arguments);
  return Promise.each(commands, function (command) {
    return exec(command);
  });
}
