"use strict";

var _ = require('lodash');
var ltusb = require('ltusb');
var proback = require('proback');
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
  this._provider = options._provider;
  this._device = options.device;
}


WvDial.prototype.setDevice = function (device, cb) {
  if (typeof device === 'function') {
    cb = device;
    device = null;
  }
  if (device) {
    this._device = device;
  }
  device = this._device;

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
