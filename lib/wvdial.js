"use strict";

var _ = require('lodash');
var util = require('util');
var ltusb = require('ltusb');
var proback = require('proback');
var Promise = require('bluebird');
var exec = require('child_process').exec;
var WvDialConf = require('./wvdialconf');

module.exports = WvDial;

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
}


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
    var usb = _.find(usbs, function (usb) {
      return usb.type === 'serial' && usb.hub === device;
    });
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
  cb = cb || proback();

  var that = this;
  var conf = this.conf;
  var provider = this.provider;
  var device = this.device;

  if (provider) {
    if (reset) {
      var promise = Promise.resolve();
      if (provider.apn) {
        promise = promise.then(function () {
          return conf.set('Init3', util.format('AT+CGDCONT=1,"IP","%s",,0,0', provider.apn));
        });
      }

      promise.then(function () {
        return conf.setProvider(provider);
      }).then(function () {
        exec('wvdialconf ' + conf.file, cb);
      });

    } else if (device) {
      conf.setProvider(provider)
        .then(function () {
          return that.setDevice(device);
        })
        .asCallback(cb);
    } else {
      cb(new Error('Device is required'));
    }

  } else {
    cb(new Error('Provider is required'));
  }

  return cb.promise;
};
