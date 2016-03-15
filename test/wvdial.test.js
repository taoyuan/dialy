"use strict";

require('./mocks/mock-ltusb');

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

  describe('#setDevice', function () {

    it('Should set device success', function () {
      var wvdial = dialy.wvdial(tempConfigPath);
      return wvdial.setDevice('2-1:1.0')
        .then(function () {
          return wvdial.conf.get('Modem').spread(function (modem) {
            assert.equal(modem, '/dev/ttyUSB0');
          });
        })
        .catch(function () {
          assert.fail();
        });
    });

    it('Should throw error if device not exist', function () {
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

});
