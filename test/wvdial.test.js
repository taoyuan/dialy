"use strict";

var assert = require('chai').assert;
var path = require('path');
var fs = require('fs-extra');
var tmp = require('tmp');
var s = require('./support');
var dialy = require('../');

var configPath = path.join(s.fixturesPath, 'wvdial.conf');

describe('wvdial', function () {
  var tempConfig, tempConfigPath;

  beforeEach(function () {
    tempConfig = tmp.fileSync();
    tempConfigPath = tempConfig.name;
    fs.copySync(configPath, tempConfigPath);
  });

  afterEach(function () {
    tempConfig.removeCallback();
  });

  it('should initiate', function () {
    var wvdial = dialy.wvdial(tempConfigPath);
    assert.ok(wvdial);
    wvdial = dialy.wvdial(tempConfigPath, {});
    assert.ok(wvdial);
    wvdial = dialy.wvdial({});
    assert.ok(wvdial);
    wvdial = dialy.wvdial();
    assert.ok(wvdial);
  });

  describe('#setDevice', function () {

    it('should work with callback', function (done) {
      var wvdial = dialy.wvdial(tempConfigPath);
      wvdial.setDevice('2-1:1.0', function (err) {
        if (err) return done(err);
        wvdial.conf.get('Modem').then(function (modem) {
          assert.equal(modem, '/dev/ttyUSB0');
        }).asCallback(done);
      })
    });

    it('should work with intiate options ', function (done) {
      var wvdial = dialy.wvdial(tempConfigPath, {
        device: '2-1:1.0'
      });
      wvdial.setDevice(function (err) {
        if (err) return done(err);
        wvdial.conf.get('Modem').then(function (modem) {
          assert.equal(modem, '/dev/ttyUSB0');
        }).asCallback(done);
      })
    });

    it('should set device success', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      return wvdial.setDevice('2-1:1.0')
        .then(function () {
          return wvdial.conf.get('Modem').then(function (modem) {
            assert.equal(modem, '/dev/ttyUSB0');
          });
        })
        .catch(function () {
          assert.fail();
        });
    });

    it('should throw error if device not exist', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      return wvdial.setDevice('xxx')
        .then(function () {
          assert.fail();
        })
        .catch(function (err) {
          assert.ok(/Not found device/.test(err.message));
        });
    });
  });

  describe('#configure', function () {
    it('should work without `apn` in provider and with reset', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      return wvdial.configure(true).then(function () {
        return wvdial.conf.get('Init3').then(function (data) {
          assert.isUndefined(data);
        })
      });
    });

    it('should work with `apn` in provider and with reset', function () {
      var wvdial = dialy.wvdial(tempConfigPath, {
        provider: {
          apn: '3gnet'
        }
      });
      return wvdial.configure(true).then(function () {
        return wvdial.conf.get('Init3').then(function (data) {
          assert.isOk(/3gnet/.test(data));
        })
      });
    });

    it('should work with device and without reset', function () {
      var wvdial = dialy.wvdial(tempConfigPath, {
        device: '2-1:1.0'
      });
      return wvdial.configure().then(function () {
        return wvdial.conf.get('Modem').then(function (data) {
          assert.equal(data, '/dev/ttyUSB0');
        })
      });
    });

    it('should work with callback', function (done) {
      var wvdial = dialy.wvdial(tempConfigPath, {
        device: '2-1:1.0'
      });
      wvdial.configure(function (err) {
        if (err) return done(err);
        wvdial.conf.get('Modem').then(function (data) {
          assert.equal(data, '/dev/ttyUSB0');
        }).asCallback(done);
      });
    });

    it('should throw error without device and without reset', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      return wvdial.configure().then(function () {
        assert.fail();
      }).catch(function (err) {
        assert.ok(err);
        assert.ok(/Device is required/.test(err.message));
      })
    });

    it('should throw error without provider', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      wvdial.provider = null;
      return wvdial.configure().then(function () {
        assert.fail();
      }).catch(function (err) {
        assert.ok(err);
        assert.ok(/Provider is required/.test(err.message));
      })
    });
  });
});
