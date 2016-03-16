"use strict";

var mockexec = require('nock-exec');

mockexec('wvdialconf.*').regex();
