"use strict";

var dialy = require('..');

var wvdial = dialy.wvdial();

wvdial.load().then(function (config) {
  console.log(config);
});
