"use strict";

var _ = require('lodash');
var fs = require('fs');
var ini = require('ini');
var inflect = require('inflect');
var proback = require('proback');
var slice = Array.prototype.slice;

module.exports = WvDialConf;

function WvDialConf(file) {
  if (!(this instanceof WvDialConf)) {
    return new WvDialConf(file);
  }

  this._file = file || '/etc/WvDialConf.conf';
}

WvDialConf.prototype.load = function (cb) {
  cb = cb || proback();

  fs.readFile(this._file, 'utf-8', function (err, data) {
    if (err) return cb(err);
    cb(null, ini.decode(data));
  });

  return cb.promise;
};

WvDialConf.prototype.save = function (data, cb) {
  cb = cb || proback();

  fs.writeFile(this._file, ini.encode(data), 'utf-8', function (err) {
    if (err) return cb(err);
    cb();
  });

  return cb.promise;
};

WvDialConf.prototype.get = function (section, key, cb) {
  if (typeof key !== 'string') {
    cb = key;
    key = section;
    section = null;
  }
  section = inflect.titleize(section || 'Dialer Defaults');
  key = inflect.titleize(key);
  cb = cb || proback();

  this.load()
    .then(function (config) {
      if (config[section] && config[section][key]) {
        return cb(null, config[section][key], section);
      }
      cb(null, config[key]);
    })
    .catch(function (error) {
      cb(error);
    });

  return cb.promise;
};

WvDialConf.prototype.set = function (/*section, key, value, cb*/) {
  var section, cb;
  var props = {};

  var args = slice.call(arguments);
  var arg = args.pop();
  if (typeof arg === 'function') {
    cb = arg;
  } else {
    args.push(arg);
  }

  if (!args.length) {
    throw new Error('No prop arguments provided');
  }

  if (args.length === 1 && typeof args[0] === 'object') {
    props = args[0];
  } else if (args.length > 2) {
    section = args[0];
    props[args[1]] = args[2];
  } else {
    if (args[1] && typeof args[1] === 'object') {
      section = args[0];
      props = args[1];
    } else {
      props[args[0]] = args[1];
    }
  }

  if (!props) {
    throw new Error('No key and value provided');
  }

  var that = this;

  section = inflect.titleize(section || 'Dialer Defaults');
  cb = cb || proback();

  this.load()
    .then(function (config) {
      var sc = config[section] = config[section] || {};
      _.forEach(props, function (value, key) {
        sc[inflect.titleize(key)] = value;
      });
      return that.save(config);
    })
    .asCallback(cb);

  return cb.promise;
};


WvDialConf.prototype.setModem = function (modem, cb) {
  cb = cb || proback();
  this.set('Modem', modem, cb);
  return cb.promise;
};

WvDialConf.prototype.setProvider = function (provider, cb) {
  cb = cb || proback();
  this.set(provider, cb);
  return cb.promise;
};
