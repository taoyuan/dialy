"use strict";

var mockexec = require('nock-exec');

mockexec('pkill.*').regex();
mockexec('sleep.*').regex();
mockexec('modprobe.*').regex();
mockexec('wvdial.*').regex();
