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
    var refreshHints = {};
    var prevRefreshHints = {};
    var filterArgs;
    var filteredItems = [];
    var filterCache = [];

    var pagesize = 0;
    var pagenum = 0;
    var totalRows = 0;

    // events
    var onRowCountChanged = new Slick.Event();
    var onRowsChanged = new Slick.Event();
    var onPagingInfoChanged = new Slick.Event();

    options = $.extend( true, {}, defaults, options );


    function beginUpdate() {
      suspend = true;
    }

    function endUpdate() {
      suspend = false;
      refresh();
    }

    function setRefreshHints( hints ) {
      refreshHints = hints;
    }

    function setFilterArgs( args ) {
      filterArgs = args;
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

    function setPagingOptions( args ) {
      if ( args.pageSize != null ) {
        pagesize = args.pageSize;
        pagenum = pagesize ? Math.min( pagenum, Math.max( 0, Math.ceil( totalRows / pagesize ) - 1 ) ) : 0;
      }

      if ( args.pageNum != null ) {
        pagenum = Math.min( args.pageNum, Math.max( 0, Math.ceil( totalRows / pagesize ) - 1 ) );
      }

      onPagingInfoChanged.notify( getPagingInfo(), null, self );

      refresh();
    }

    function getPagingInfo() {
      var totalPages = pagesize ? Math.max( 1, Math.ceil( totalRows / pagesize ) ) : 1;
      return { pageSize: pagesize, pageNum: pagenum, totalRows: totalRows, totalPages: totalPages };
    }

    function sort( comparer, ascending ) {
      sortAsc = ascending;
      sortComparer = comparer;
      fastSortField = null;
      if ( ascending === false ) {
        items.reverse();
      }
      items.sort( comparer );
      if ( ascending === false ) {
        items.reverse();
      }
      idxById = {};
      updateIdxById();
      refresh();
    }

    /***
     * Provides a workaround for the extremely slow sorting in IE.
     * Does a [lexicographic] sort on a give column by temporarily overriding Object.prototype.toString
     * to return the value of that field and then doing a native Array.sort().
     */
    function fastSort( field, ascending ) {
      sortAsc = ascending;
      fastSortField = field;
      sortComparer = null;
      var oldToString = Object.prototype.toString;
      Object.prototype.toString = (typeof field === 'function') ? field : function() {
        return this[ field ];
      };
      // an extra reversal for descending sort keeps the sort stable
      // (assuming a stable native sort implementation, which isn't true in some cases)
      if ( ascending === false ) {
        items.reverse();
      }
      items.sort();
      Object.prototype.toString = oldToString;
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
      } else if ( fastSortField ) {
        fastSort( fastSortField, sortAsc );
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

    function getItemMetadata( i ) {
      var item = rows[ i ];
      if ( item === undefined ) {
        return null;
      }

      // overrides for grouping rows
      if ( item.__group ) {
        return options.groupItemMetadataProvider.getGroupRowMetadata( item );
      }

      // overrides for totals rows
      if ( item.__groupTotals ) {
        return options.groupItemMetadataProvider.getTotalsRowMetadata( item );
      }

      return null;
    }

    function getFilteredAndPagedItems( items ) {
      filteredItems = pagesize ? items : items.concat();

      // get the current page
      var paged;
      if ( pagesize ) {
        if ( filteredItems.length < pagenum * pagesize ) {
          pagenum = Math.floor( filteredItems.length / pagesize );
        }
        paged = filteredItems.slice( pagesize * pagenum, pagesize * pagenum + pagesize );
      } else {
        paged = filteredItems;
      }

      return { totalRows: filteredItems.length, rows: paged };
    }

    function getRowDiffs( rows, newRows ) {
      var item, r, diff = [];
      var from = 0, to = newRows.length;

      if ( refreshHints && refreshHints.ignoreDiffsBefore ) {
        from = Math.max( 0,
            Math.min( newRows.length, refreshHints.ignoreDiffsBefore ) );
      }

      if ( refreshHints && refreshHints.ignoreDiffsAfter ) {
        to = Math.min( newRows.length,
            Math.max( 0, refreshHints.ignoreDiffsAfter ) );
      }

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

      if ( refreshHints.isFilterNarrowing !== prevRefreshHints.isFilterNarrowing ||
          refreshHints.isFilterExpanding !== prevRefreshHints.isFilterExpanding ) {
        filterCache = [];
      }

      var filteredItems = getFilteredAndPagedItems( _items );
      totalRows = filteredItems.totalRows;
      var newRows = filteredItems.rows;

      var diff = getRowDiffs( rows, newRows );

      rows = newRows;

      return diff;
    }

    function refresh() {
      if ( suspend ) {
        return;
      }

      var countBefore = rows.length;
      var totalRowsBefore = totalRows;

      // pass as direct refs to avoid closure perf hit
      var diff = recalc( items, filter );

      // if the current page is no longer valid, go to last page and recalc
      // we suffer a performance penalty here, but the main loop (recalc) remains highly optimized
      if ( pagesize && totalRows < pagenum * pagesize ) {
        pagenum = Math.max( 0, Math.ceil( totalRows / pagesize ) - 1 );
        diff = recalc( items, filter );
      }

      updated = null;
      prevRefreshHints = refreshHints;
      refreshHints = {};

      if ( totalRowsBefore !== totalRows ) {
        onPagingInfoChanged.notify( getPagingInfo(), null, self );
      }
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

    function syncGridCellCssStyles( grid, key ) {
      var hashById;
      var inHandler;

      // since this method can be called after the cell styles have been set,
      // get the existing ones right away
      storeCellCssStyles( grid.getCellCssStyles( key ) );

      function storeCellCssStyles( hash ) {
        hashById = {};
        for ( var row in hash ) {
          var id = rows[ row ][ idProperty ];
          hashById[ id ] = hash[ row ];
        }
      }

      function update() {
        if ( hashById ) {
          inHandler = true;
          ensureRowsByIdCache();
          var newHash = {};
          for ( var id in hashById ) {
            var row = rowsById[ id ];
            if ( row != null ) {
              newHash[ row ] = hashById[ id ];
            }
          }
          grid.setCellCssStyles( key, newHash );
          inHandler = false;
        }
      }

      grid.onCellCssStylesChanged.subscribe(function( e, args ) {
        if ( inHandler ) { return; }
        if ( key !== args.key ) { return; }
        if ( args.hash ) {
          storeCellCssStyles( args.hash );
        }
      });

      this.onRowsChanged.subscribe( update );

      this.onRowCountChanged.subscribe( update );
    }

    $.extend( this, {
      // methods
      'beginUpdate': beginUpdate,
      'endUpdate': endUpdate,
      'setPagingOptions': setPagingOptions,
      'getPagingInfo': getPagingInfo,
      'getItems': getItems,
      'setItems': setItems,
      'sort': sort,
      'fastSort': fastSort,
      'reSort': reSort,
      'getIdxById': getIdxById,
      'getRowById': getRowById,
      'getItemById': getItemById,
      'getItemByIdx': getItemByIdx,
      'mapRowsToIds': mapRowsToIds,
      'mapIdsToRows': mapIdsToRows,
      'setRefreshHints': setRefreshHints,
      'setFilterArgs': setFilterArgs,
      'refresh': refresh,
      'updateItem': updateItem,
      'insertItem': insertItem,
      'addItem': addItem,
      'deleteItem': deleteItem,
      'syncGridSelection': syncGridSelection,
      'syncGridCellCssStyles': syncGridCellCssStyles,

      // data provider methods
      'getLength': getLength,
      'getItem': getItem,
      'getItemMetadata': getItemMetadata,

      // events
      'onRowCountChanged': onRowCountChanged,
      'onRowsChanged': onRowsChanged,
      'onPagingInfoChanged': onPagingInfoChanged
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
