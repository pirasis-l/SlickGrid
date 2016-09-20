'use strict';

function EventData() {
  var isPropagationStopped = false;
  var isImmediatePropagationStopped = false;

  this.stopPropagation = function () {
    isPropagationStopped = true;
  };

  this.isPropagationStopped = function () {
    return isPropagationStopped;
  };

  this.stopImmediatePropagation = function () {
    isImmediatePropagationStopped = true;
  };

  this.isImmediatePropagationStopped = function () {
    return isImmediatePropagationStopped;
  };
}

function Event() {
  var handlers = [];

  this.subscribe = function (fn) {
    handlers.push(fn);
  };

  this.unsubscribe = function (fn) {
    for (var i = handlers.length - 1; i >= 0; i--) {
      if (handlers[i] === fn) {
        handlers.splice(i, 1);
      }
    }
  };

  this.notify = function (args, e, scope) {
    e = e || new EventData();
    scope = scope || this;

    var returnValue;
    for (var i = 0; i < handlers.length && !(e.isPropagationStopped() || e.isImmediatePropagationStopped()); i++) {
      returnValue = handlers[i].call(scope, e, args);
    }

    return returnValue;
  };
}

function EventHandler() {
  var handlers = [];

  this.subscribe = function (event, handler) {
    handlers.push({
      event: event,
      handler: handler,
    });
    event.subscribe(handler);

    // allow chaining
    return this;
  };

  this.unsubscribe = function (event, handler) {
    var i = handlers.length;
    while (i--) {
      if (handlers[i].event === event &&
          handlers[i].handler === handler) {
        handlers.splice(i, 1);
        event.unsubscribe(handler);
        return null;
      }
    }

    // allow chaining
    return this;
  };

  this.unsubscribeAll = function () {
    var i = handlers.length;
    while (i--) {
      handlers[i].event.unsubscribe(handlers[i].handler);
    }

    handlers = [];

    // allow chaining
    return this;
  };
}

function Range(fromRow, fromCell, toRow, toCell) {
  if (toRow === undefined && toCell === undefined) {
    toRow = fromRow;
    toCell = fromCell;
  }

  this.fromRow = Math.min(fromRow, toRow);
  this.fromCell = Math.min(fromCell, toCell);
  this.toRow = Math.max(fromRow, toRow);
  this.toCell = Math.max(fromCell, toCell);

  this.isSingleRow = function () {
    return this.fromRow === this.toRow;
  };

  this.isSingleCell = function () {
    return this.fromRow === this.toRow && this.fromCell === this.toCell;
  };

  this.contains = function (row, cell) {
    return row >= this.fromRow && row <= this.toRow &&
        cell >= this.fromCell && cell <= this.toCell;
  };

  this.toString = function () {
    if (this.isSingleCell()) {
      return '(' + this.fromRow + ':' + this.fromCell + ')';
    }

    return '(' + this.fromRow + ':' + this.fromCell + ' - ' + this.toRow + ':' + this.toCell + ')';
  };
}

function NonDataItem() {
  this.__nonDataRow = true;
}

// register namespace
module.exports = {
  Slick: {
    Event: Event,
    EventData: EventData,
    EventHandler: EventHandler,
    Range: Range,
    NonDataRow: NonDataItem,

    keyCode: {
      BACKSPACE: 8,
      TAB: 9,
      ENTER: 13,
      ESCAPE: 27,
      PAGE_UP: 33,
      PAGE_DOWN: 34,
      END: 35,
      HOME: 36,
      LEFT: 37,
      UP: 38,
      RIGHT: 39,
      DOWN: 40,
      INSERT: 45,
      DELETE: 46,
    },
  },
};
