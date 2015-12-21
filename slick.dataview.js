(function( $ ) {
  'use strict';

  function DataView( options ) {
    var self = this;

    var defaults = {
      groupItemMetadataProvider: null,
      inlineFilters: false
    };

    // private
    // property holding a unique row id
    var idProperty = 'id';
    // data by index
    var items = [];
    // data by row
    var rows = [];
    // indexes by id
    var idxById = {};
    // rows by id; lazy-calculated
    var rowsById = null;
    // filter function
    var filter = null;
    // updated item ids
    var updated = null;
    // suspends the recalculation
    var suspend = false;
    var sortAsc = true;
    var fastSortField;
    var sortComparer;
    var filteredItems = [];

    var totalRows = 0;

    // events
    var onRowCountChanged = new Slick.Event();
    var onRowsChanged = new Slick.Event();

    options = $.extend( true, {}, defaults, options );


    function beginUpdate() {
      suspend = true;
    }

    function endUpdate() {
      suspend = false;
      refresh();
    }

    function updateIdxById( startingIndex ) {
      startingIndex = startingIndex || 0;
      var id;
      for ( var i = startingIndex, l = items.length; i < l; i++ ) {
        id = items[ i ][ idProperty ];
        if ( id === undefined ) {
          throw 'Each data element must implement a unique \'id\' property';
        }
        idxById[ id ] = i;
      }
    }

    function ensureIdUniqueness() {
      var id;
      for ( var i = 0, l = items.length; i < l; i++ ) {
        id = items[ i ][ idProperty ];
        if ( id === undefined || idxById[ id ] !== i ) {
          throw 'Each data element must implement a unique \'id\' property';
        }
      }
    }

    function getItems() {
      return items;
    }

    function setItems( data, objectIdProperty ) {
      if ( objectIdProperty !== undefined ) {
        idProperty = objectIdProperty;
      }
      items = filteredItems = data;
      idxById = {};
      updateIdxById();
      ensureIdUniqueness();
      refresh();
    }

    function sort( comparer, ascending ) {
      sortAsc = ascending;
      sortComparer = comparer;
      fastSortField = null;
      items.sort( comparer );
      if ( ascending === false ) {
        items.reverse();
      }
      idxById = {};
      updateIdxById();
      refresh();
    }

    function reSort() {
      if ( sortComparer ) {
        sort( sortComparer, sortAsc );
      }
    }

    function getItemByIdx( i ) {
      return items[ i ];
    }

    function getIdxById( id ) {
      return idxById[ id ];
    }

    function ensureRowsByIdCache() {
      if ( !rowsById ) {
        rowsById = {};
        for ( var i = 0, l = rows.length; i < l; i++ ) {
          rowsById[ rows[ i ][ idProperty ] ] = i;
        }
      }
    }

    function getRowById( id ) {
      ensureRowsByIdCache();
      return rowsById[ id ];
    }

    function getItemById( id ) {
      return items[ idxById[ id ] ];
    }

    function mapIdsToRows( idArray ) {
      var rows = [];
      ensureRowsByIdCache();
      for ( var i = 0, l = idArray.length; i < l; i++ ) {
        var row = rowsById[ idArray[ i ] ];
        if ( row != null ) {
          rows[ rows.length ] = row;
        }
      }
      return rows;
    }

    function mapRowsToIds( rowArray ) {
      var ids = [];
      for ( var i = 0, l = rowArray.length; i < l; i++ ) {
        if ( rowArray[ i ] < rows.length ) {
          ids[ ids.length ] = rows[ rowArray[ i ] ][ idProperty ];
        }
      }
      return ids;
    }

    function updateItem( id, item ) {
      if ( idxById[ id ] === undefined || id !== item[ idProperty ] ) {
        throw 'Invalid or non-matching id';
      }
      items[ idxById[ id ] ] = item;
      if ( !updated ) {
        updated = {};
      }
      updated[ id ] = true;
      refresh();
    }

    function insertItem( insertBefore, item ) {
      items.splice( insertBefore, 0, item );
      updateIdxById( insertBefore );
      refresh();
    }

    function addItem( item ) {
      items.push( item );
      updateIdxById( items.length - 1 );
      refresh();
    }

    function deleteItem( id ) {
      var idx = idxById[ id ];
      if ( idx === undefined ) {
        throw 'Invalid id';
      }
      delete idxById[ id ];
      items.splice( idx, 1 );
      updateIdxById( idx );
      refresh();
    }

    function getLength() {
      return rows.length;
    }

    function getItem( i ) {
      var item = rows[ i ];

      return item;
    }

    function getRowDiffs( rows, newRows ) {
      var item, r, diff = [];
      var from = 0, to = newRows.length;

      for ( var i = from, rl = rows.length; i < to; i++ ) {
        if ( i >= rl ) {
          diff[ diff.length ] = i;
        } else {
          item = newRows[ i ];
          r = rows[ i ];
        }
      }
      return diff;
    }

    function recalc( _items ) {
      rowsById = null;

      totalRows = _items.length;

      var newRows = _items.concat();
      var diff = getRowDiffs( rows, newRows );

      rows = newRows;

      return diff;
    }

    function refresh() {
      if ( suspend ) {
        return;
      }

      var countBefore = rows.length;

      // pass as direct refs to avoid closure perf hit
      var diff = recalc( items, filter );

      updated = null;

      if ( countBefore !== rows.length ) {
        onRowCountChanged.notify({ previous: countBefore, current: rows.length }, null, self );
      }

      if ( diff.length > 0 ) {
        onRowsChanged.notify({ rows: diff }, null, self );
      }
    }

    function syncGridSelection( grid, preserveHidden, preserveHiddenOnSelectionChange ) {
      var self = this;
      var inHandler;
      var selectedRowIds = self.mapRowsToIds( grid.getSelectedRows() );
      var onSelectedRowIdsChanged = new Slick.Event();

      function setSelectedRowIds( rowIds ) {
        if ( selectedRowIds.join( ',' ) === rowIds.join( ',' ) ) {
          return;
        }

        selectedRowIds = rowIds;

        onSelectedRowIdsChanged.notify({
          'grid': grid,
          'ids': selectedRowIds
        }, new Slick.EventData(), self );
      }

      function update() {
        if ( selectedRowIds.length > 0 ) {
          inHandler = true;
          var selectedRows = self.mapIdsToRows( selectedRowIds );
          if ( !preserveHidden ) {
            setSelectedRowIds( self.mapRowsToIds( selectedRows ) );
          }
          grid.setSelectedRows( selectedRows );
          inHandler = false;
        }
      }

      grid.onSelectedRowsChanged.subscribe(function() {
        if ( inHandler ) { return; }
        var newSelectedRowIds = self.mapRowsToIds( grid.getSelectedRows() );
        if ( !preserveHiddenOnSelectionChange || !grid.getOptions().multiSelect ) {
          setSelectedRowIds( newSelectedRowIds );
        } else {
          // keep the ones that are hidden
          var existing = $.grep( selectedRowIds, function( id ) { return self.getRowById( id ) === undefined; });
          // add the newly selected ones
          setSelectedRowIds( existing.concat( newSelectedRowIds ) );
        }
      });

      this.onRowsChanged.subscribe( update );

      this.onRowCountChanged.subscribe( update );

      return onSelectedRowIdsChanged;
    }

    $.extend( this, {
      name: 'DataView',

      // methods
      'beginUpdate': beginUpdate,
      'endUpdate': endUpdate,
      'getItems': getItems,
      'setItems': setItems,
      'sort': sort,
      'reSort': reSort,
      'getIdxById': getIdxById,
      'getRowById': getRowById,
      'getItemById': getItemById,
      'getItemByIdx': getItemByIdx,
      'mapRowsToIds': mapRowsToIds,
      'mapIdsToRows': mapIdsToRows,
      'refresh': refresh,
      'updateItem': updateItem,
      'insertItem': insertItem,
      'addItem': addItem,
      'deleteItem': deleteItem,
      'syncGridSelection': syncGridSelection,

      // data provider methods
      'getLength': getLength,
      'getItem': getItem,

      // events
      'onRowCountChanged': onRowCountChanged,
      'onRowsChanged': onRowsChanged
    });
  }

  $.extend( true, window, {
    Slick: {
      Data: {
        DataView: DataView
      }
    }
  });

})( jQuery );
