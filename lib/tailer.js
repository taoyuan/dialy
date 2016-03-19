"use strict";

var util = require('util');
var events = require('events');
var Tail = require('always-tail');

module.exports = Tailer;

/**
 *
 * @param filename
 * @returns {Tailer}
 * @constructor
 */
function Tailer(filename) {
  if (!(this instanceof Tailer)) {
    return new Tailer(filename);
  }

  var that = this;
  this.lines = 0;

  var tail = this.tail = new Tail(filename, '\n', {interval: 50});

  tail.on('line', function (data) {
    that.lines++;
    that.emit('line', data, that.lines);
  });


  tail.on('error', function (err) {
    that.emit('error', err);
  });

  tail.watch();
}

util.inherits(Tailer, events.EventEmitter);

Tailer.prototype.reset = function () {
  this.lines = 0;
};

Tailer.prototype.close = function () {
  if (this.closed) return;
  this.closed = true;
  this.tail.unwatch();
  this.emit('close');
};


