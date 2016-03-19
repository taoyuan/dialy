"use strict";

var Promise = require('bluebird');
var dialy = require('..');

var options = {
  configFilePath: '/etc/wvdial.conf',
  provider: {"label": "China Unicom", "apn": "3gnet", "phone": "*99#", "username": "user", "password": "pass"}
};

var wvdial = dialy.wvdial(options);

Promise.resolve().then(function () {
  return wvdial.configure(true);
}).then(function () {
  return wvdial.connect();
}).catch(function (err) {
  throw err;
});
