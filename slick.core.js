(function( $ ) {
  'use strict';

  function EventData() {
    var isPropagationStopped = false;
    var isImmediatePropagationStopped = false;

    this.stopPropagation = function() {
      isPropagationStopped = true;
    };

    this.isPropagationStopped = function() {
      return isPropagationStopped;
    };

    this.stopImmediatePropagation = function() {
      isImmediatePropagationStopped = true;
    };

    this.isImmediatePropagationStopped = function() {
      return isImmediatePropagationStopped;
    };
  }

  function Event() {
    var handlers = [];

    this.subscribe = function( fn ) {
      handlers.push( fn );
    };

    this.unsubscribe = function( fn ) {
      for ( var i = handlers.length - 1; i >= 0; i-- ) {
        if ( handlers[ i ] === fn ) {
          handlers.splice( i, 1 );
        }
      }
    };

    this.notify = function( args, e, scope ) {
      e = e || new EventData();
      scope = scope || this;

      var returnValue;
      for ( var i = 0; i < handlers.length && !(e.isPropagationStopped() || e.isImmediatePropagationStopped()); i++ ) {
        returnValue = handlers[ i ].call( scope, e, args );
      }

      return returnValue;
    };
  }

  function EventHandler() {
    var handlers = [];

    this.subscribe = function( event, handler ) {
      handlers.push({
        event: event,
        handler: handler
      });
      event.subscribe( handler );

      // allow chaining
      return this;
    };

    this.unsubscribe = function( event, handler ) {
      var i = handlers.length;
      while ( i-- ) {
        if ( handlers[ i ].event === event &&
            handlers[ i ].handler === handler ) {
          handlers.splice( i, 1 );
          event.unsubscribe( handler );
          return;
        }
      }

      // allow chaining
      return this;
    };

    this.unsubscribeAll = function() {
      var i = handlers.length;
      while ( i-- ) {
        handlers[ i ].event.unsubscribe( handlers[ i ].handler );
      }
      handlers = [];

      // allow chaining
      return this;
    };
  }

  function Range( fromRow, fromCell, toRow, toCell ) {
    if ( toRow === undefined && toCell === undefined ) {
      toRow = fromRow;
      toCell = fromCell;
    }

    this.fromRow = Math.min( fromRow, toRow );
    this.fromCell = Math.min( fromCell, toCell );
    this.toRow = Math.max( fromRow, toRow );
    this.toCell = Math.max( fromCell, toCell );

    this.isSingleRow = function() {
      return this.fromRow === this.toRow;
    };

    this.isSingleCell = function() {
      return this.fromRow === this.toRow && this.fromCell === this.toCell;
    };

    this.contains = function( row, cell ) {
      return row >= this.fromRow && row <= this.toRow &&
          cell >= this.fromCell && cell <= this.toCell;
    };

    this.toString = function() {
      if ( this.isSingleCell() ) {
        return '(' + this.fromRow + ':' + this.fromCell + ')';
      } else {
        return '(' + this.fromRow + ':' + this.fromCell + ' - ' + this.toRow + ':' + this.toCell + ')';
      }
    };
  }

  function NonDataItem() {
    this.__nonDataRow = true;
  }

  function Group() {
    this.__group = true;
    this.level = 0;
    this.count = 0;
    this.value = null;
    this.title = null;
    this.collapsed = false;
    this.totals = null;
    this.rows = [];
    this.groups = null;
    this.groupingKey = null;
  }

  Group.prototype = new NonDataItem();

  Group.prototype.equals = function( group ) {
    return this.value === group.value &&
        this.count === group.count &&
        this.collapsed === group.collapsed &&
        this.title === group.title;
  };

  function GroupTotals() {
    this.__groupTotals = true;
    this.group = null;
    this.initialized = false;
  }

  GroupTotals.prototype = new NonDataItem();

  function EditorLock() {
    var activeEditController = null;

    this.isActive = function( editController ) {
      return (editController ? activeEditController === editController : activeEditController !== null);
    };

    this.activate = function( editController ) {
      // already activated?
      if ( editController === activeEditController ) {
        return;
      }
      if ( activeEditController !== null ) {
        throw 'SlickGrid.EditorLock.activate: an editController is still active, can\'t activate another editController';
      }
      if ( !editController.commitCurrentEdit ) {
        throw 'SlickGrid.EditorLock.activate: editController must implement .commitCurrentEdit()';
      }
      if ( !editController.cancelCurrentEdit ) {
        throw 'SlickGrid.EditorLock.activate: editController must implement .cancelCurrentEdit()';
      }
      activeEditController = editController;
    };

    this.deactivate = function( editController ) {
      if ( activeEditController !== editController ) {
        throw 'SlickGrid.EditorLock.deactivate: specified editController is not the currently active one';
      }
      activeEditController = null;
    };

    this.commitCurrentEdit = function() {
      return (activeEditController ? activeEditController.commitCurrentEdit() : true);
    };

    this.cancelCurrentEdit = function cancelCurrentEdit() {
      return (activeEditController ? activeEditController.cancelCurrentEdit() : true);
    };
  }

  // register namespace
  $.extend( true, window, {
    'Slick': {
      'Event': Event,
      'EventData': EventData,
      'EventHandler': EventHandler,
      'Range': Range,
      'NonDataRow': NonDataItem,
      'Group': Group,
      'GroupTotals': GroupTotals,
      'EditorLock': EditorLock,

      'GlobalEditorLock': new EditorLock(),

      'keyCode': {
        'BACKSPACE': 8,
        'TAB': 9,
        'ENTER': 13,
        'ESCAPE': 27,
        'PAGE_UP': 33,
        'PAGE_DOWN': 34,
        'END': 35,
        'HOME': 36,
        'LEFT': 37,
        'UP': 38,
        'RIGHT': 39,
        'DOWN': 40,
        'INSERT': 45,
        'DELETE': 46
      }
    }
  });
})( jQuery );
