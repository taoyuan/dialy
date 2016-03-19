"use strict";

var dialy = require('..');

var options = {
  configFilePath: '/etc/wvdial.conf',
  provider: {"label": "China Unicom", "apn": "3gnet", "phone": "*99#", "username": "user", "password": "pass"}
};

var wvdial = dialy.wvdial(options);

wvdial.configure(true).then(function (data) {
  console.log(data)
}).catch(function (err) {
  throw err;
});
