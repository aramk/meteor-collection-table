var nextId = 1;
function getNextId() {
  return nextId++;
}
var sessionId = '_collectionTable_';
var selectedClass = 'selected';
var selectedField = 'selectedIds';
var tableIdField = 'tableIdField';
var selectEventName = 'select';
var deselectEventName = 'deselectAll';
var TemplateClass = Template.collectionTable;
var tableInstances = {};

function setReactiveVar(tableId, name, value) {
  Session.set(getSessionVarName(tableId, name), value);
}

function getSessionVarName(tableId, name) {
  return sessionId + tableId + ':' + name;
}

function getReactiveVar(tableId, name) {
  return Session.get(getSessionVarName(tableId, name));
}

function getRow(id, template) {
  return $(template.find('tr[data-id="' + id + '"]'))
}

function getSelectedRows(tableId, template) {
  return _.map(getSelectedIds(tableId), function(id) {
    getRow(id, template)
  });
}

function setSelectedIds(tableId, ids) {
  var selectedIds = getSelectedIds(tableId);
  if (_.isEqual(selectedIds, ids)) {
    return;
  }
  deselectAll(tableId);
  _setSelectedIds(tableId, ids);
}

function _setSelectedIds(tableId, ids) {
  var template = tableInstances[tableId].template;
  _.each(ids, function(id) {
    var $row = getRow(id, template);
    $row.addClass(selectedClass);
  });
  setReactiveVar(tableId, selectedField, ids);
  var tableNode = getDomNode(template);
  $(tableNode).trigger(selectEventName, ids);
}

function getSelectedIds(tableId) {
  return getReactiveVar(tableId, selectedField) || [];
}

function deselectAll(tableId) {
  var selectedIds = getSelectedIds(tableId);
  var template = tableInstances[tableId].template;
  _.each(selectedIds, function(id) {
    var $selectedRow = getRow(id, template);
    $selectedRow.removeClass(selectedClass);
  });
  setReactiveVar(tableId, selectedField, null);
  var tableNode = getDomNode(template);
  $(tableNode).trigger(deselectEventName, selectedIds);
  return selectedIds;
}

function toggleSelection(tableId, id) {
  var selectedIds = getSelectedIds(tableId);
  if (_.indexOf(selectedIds, id) >= 0) {
    removeSelection(tableId, id);
  } else {
    addSelection(tableId, id);
  }
}

function addSelection(tableId, id) {
  setSelectedIds(tableId, _.union(getSelectedIds(tableId), id));
}

function removeSelection(tableId, id) {
  setSelectedIds(tableId, _.without(getSelectedIds(tableId), id));
}

function getDomNode(template) {
  return template.find('.collection-table');
}

function setDomTableId(tableId, domNode) {
  $(domNode).data(tableIdField, tableId);
}

function getDomTableId(domNode) {
  return $(domNode).data(tableIdField);
}

function configureSettings(data) {
  var items = data.items;
  var collection = data.collection;
  if (!collection) {
    if (items) {
      collection = Collections.get(items);
    } else {
      throw new Error('Either or both of "items" and "collection" attributes must be provided.');
    }
  } else {
    collection = Collections.resolve(collection);
  }
  // Store them for use in helpers.
  data.items = items;
  data.collection = collection;
  if (!collection) {
    console.warn('No collection provided.', data);
  } else {
    var collectionName = data.collectionName || Collections.getName(collection);
    if (collectionName) {
      var collectionId = Strings.firstToLowerCase(Strings.singular(collectionName));
      data.createRoute = data.createRoute || collectionId + 'Item';
      data.editRoute = data.editRoute || collectionId + 'Edit';
    } else {
      console.warn('No collection name provided', data);
    }
  }
  data._tableId = getNextId();
  tableInstances[data._tableId] = {
    template: data._template
  };
}

// Exports

// We cannot use references alone since they are obfuscated during minification, so we need to
// name them.
var methods = {
  getRow: getRow, getSelectedRows: getSelectedRows, setSelectedIds: setSelectedIds,
  getSelectedIds: getSelectedIds, deselectAll: deselectAll, toggleSelection: toggleSelection,
  addSelection: addSelection, removeSelection: removeSelection, getDomNode: getDomNode,
  setDomTableId: setDomTableId, getDomTableId: getDomTableId
};
_.extend(TemplateClass, methods);

// Template methods.

TemplateClass.created = function() {
  var data = this.data;
  data._template = this;
};

TemplateClass.rendered = function() {
  var $table = $(this.findAll('.reactive-table')).addClass('ui selectable table segment');
  var $filter = $(this.findAll('.reactive-table-filter'));
  var $toolbar = $filter.prev('.toolbar');
  $('.right.menu', $toolbar).append($filter.addClass('item'));
  $(this.findAll('input.form-control')).wrap('<div class="ui input"></div>');
  var $nav = $(this.findAll('.reactive-table-navigation'));
  var $footer = $('<tfoot><tr><th></th></tr></tfoot>');
  var colCount = $('tr:first th', $table).length;
  $('tr th', $footer).attr('colspan', colCount).append($nav);
  $('tbody', $table).after($footer);

  var template = this;
  var data = this.data;
  var tableId = data._tableId;
  var settings = data.settings;

  setSelectedIds(tableId, null);
  setDomTableId(tableId, getDomNode(this));

  var collection = data.collection;
  var createRoute = data.createRoute;
  var editRoute = data.editRoute;

  template.createItem = createItem;
  template.editItem = editItem;
  template.deleteItem = deleteItem;

  function createHandlerContext(extraArgs) {
    return _.extend({
      ids: getSelectedIds(tableId),
      selectedRows: getSelectedRows(tableId, template),
      collection: collection,
      createRoute: createRoute,
      editRoute: editRoute
    }, extraArgs);
  }

  function createItem() {
    if (settings.onCreate) {
      settings.onCreate(createHandlerContext());
    } else {
      typeof Router !== 'undefined' && Router.go(createRoute);
    }
  }

  function editItem(args) {
    var defaultHandler = function() {
      var ids = args.ids || getSelectedIds(tableId);
      var id = ids[0];
      typeof Router !== 'undefined' && Router.go(editRoute, {_id: id});
    };
    if (settings.onEdit) {
      settings.onEdit(createHandlerContext(_.extend({defaultHandler: defaultHandler}, args)));
    } else {
      defaultHandler();
    }
  }

  function deleteItem() {
    if (confirm('Delete item?')) {
      if (settings.onDelete) {
        settings.onDelete(createHandlerContext());
      } else {
        _.each(getSelectedIds(tableId), function(id) {
          collection.remove(id);
        })
      }
    }
  }
};

TemplateClass.events({
  'click table.selectable tbody tr': function(e, template) {
    var data = template.data;
    var tableId = data._tableId;
    var id = this._id;
    if (!e.metaKey) {
      deselectAll(tableId);
    }
    toggleSelection(tableId, id);
  },
  'dblclick table.selectable tbody tr': function(e, template) {
    var id = $(e.target).closest('tr').data('id');
    template.editItem({event: e, ids: [id], model: this});
  },
  'click .create.item': function(e, template) {
    template.createItem();
  },
  'click .edit.item': function(e, template) {
    template.editItem({event: e});
  },
  'click .delete.item': function(e, template) {
    template.deleteItem();
  }
});

TemplateClass.helpers({
  _settings: function() {
    var data = this;
    configureSettings(data);
    var tableId = data._tableId;
    // Prevent reuse of the settings object across tables from assigning the same group.
    data.settings = Setter.clone(data.settings);
    return {
      items: data.items || data.collection,
      tableSettings: _.defaults(data.settings, {
        // Group is unique so session variables are never shared between tabels.
        group: tableId,
        rowsPerPage: 10,
        showFilter: true,
        useFontAwesome: true
      }),
      tableId: tableId
    };
  },
  selectionItemsStyle: function() {
    var data = this;
    var value = getSelectedIds(data._tableId);
    return value.length > 0 ? '' : 'display: none';
  }
});
