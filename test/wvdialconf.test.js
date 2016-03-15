"use strict";

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs-extra');
var tmp = require('tmp');
var s = require('./support');
var dialy = require('../');

var configPath = path.join(s.fixturesPath, 'wvdial.conf');

describe('wvdialconf', function () {
  var tempConfig, tempConfigPath;

  beforeEach(function () {
    tempConfig = tmp.fileSync();
    tempConfigPath = tempConfig.name;
  });

  afterEach(function () {
    tempConfig.removeCallback();
  });

  it('#load', function () {
    var wvdialconf = dialy.wvdialconf(configPath);
    return wvdialconf.load()
      .then(function (config) {
        assert.ok(config);
      })
  });

  it('#save', function () {
    var wvdialconf = dialy.wvdialconf(configPath);
    var tmpwvdialconf = dialy.wvdialconf(tempConfigPath);

    var cfg;
    return wvdialconf.load()
      .then(function (config) {
        assert.ok(config);
        config['Username'] = 'TY';
        cfg = config;
        return tmpwvdialconf.save(config);
      })
      .then(function () {
        return tmpwvdialconf.load();
      })
      .then(function (config) {
        assert.deepEqual(cfg, config);
      });
  });

  it('#get', function () {
    var wvdialconf = dialy.wvdialconf(configPath);
    return wvdialconf.get('Modem')
      .spread(function (value, section) {
        assert.equal('Dialer Defaults', section);
        assert.equal('/dev/ttyS2', value);
      });
  });

  it('#set', function () {
    fs.copySync(configPath, tempConfigPath);
    var wvdialconf = dialy.wvdialconf(tempConfigPath);
    return wvdialconf.set('Modem', '/dev/ttyUSB0')
      .then(function () {
        return wvdialconf.get('Modem');
      })
      .spread(function (value, section) {
        assert.equal('Dialer Defaults', section);
        assert.equal('/dev/ttyUSB0', value);
      });
  });

  it('#setModem', function () {
    fs.copySync(configPath, tempConfigPath);
    var wvdialconf = dialy.wvdialconf(tempConfigPath);
    return wvdialconf.setModem('/dev/ttyUSB0')
      .then(function () {
        return wvdialconf.get('Modem');
      })
      .spread(function (value, section) {
        assert.equal('Dialer Defaults', section);
        assert.equal('/dev/ttyUSB0', value);
      });
  });

  it('#setProvider', function () {
    fs.copySync(configPath, tempConfigPath);
    var wvdialconf = dialy.wvdialconf(tempConfigPath);
    var provider = {
      phone: '123456',
      username: 'user',
      password: 'pass'
    };
    return wvdialconf.setProvider(provider)
      .then(function () {
        return wvdialconf.load();
      })
      .then(function (config) {
        var sc = config['Dialer Defaults'];
        assert.equal(sc['Phone'], provider.phone);
        assert.equal(sc['Username'], provider.username);
        assert.equal(sc['Password'], provider.password);
      });
  });
});
