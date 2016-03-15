"use strict";

var proback = require('proback');
var mock = require('mock-require');

mock('ltusb', function (cb) {
  cb = cb || proback();
  cb(null, require('../fixtures/usbs'));
  return cb.promise;
});
