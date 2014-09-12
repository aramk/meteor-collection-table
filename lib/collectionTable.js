var nextId = 1;
function getNextId() {
  return nextId++;
}
var sessionId = '_collectionTable_';
var selectedClass = 'selected';
var selectedField = 'selectedId';
var tableIdField = 'tableIdField';
var selectEventName = 'select';
var deselectEventName = 'deselect';
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

function getSelectedRow(tableId, template) {
  var id = getSelectedId(tableId);
  return id && getRow(id, template);
}

function setSelectedId(tableId, id) {
  var selectedId = getSelectedId(tableId);
  if (selectedId === id) {
    return;
  }
  deselect(tableId);
  _setSelectedId(tableId, id);
}

function _setSelectedId(tableId, id) {
  var template = tableInstances[tableId].template;
  var $row = getRow(id, template);
  $row.addClass(selectedClass);
  setReactiveVar(tableId, selectedField, id);
  var tableNode = getDomNode(template);
  $(tableNode).trigger(selectEventName, [id]);
}

function getSelectedId(tableId) {
  return getReactiveVar(tableId, selectedField);
}

function deselect(tableId) {
  var selectedId = getSelectedId(tableId);
  var template = tableInstances[tableId].template;
  if (selectedId) {
    var $selectedRow = getRow(selectedId, template);
    $selectedRow.removeClass(selectedClass);
    setReactiveVar(tableId, selectedField, null);
    var tableNode = getDomNode(template);
    $(tableNode).trigger(deselectEventName, [selectedId]);
    return selectedId;
  } else {
    return false;
  }
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

  // TODO(aramk) Depends on Collections utility methods - add as explicit dependency.

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

var methods = {
  getRow: getRow, getSelectedRow: getSelectedRow, setSelectedId: setSelectedId,
  getSelectedId: getSelectedId, deselect: deselect, getDomNode: getDomNode,
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

  setSelectedId(tableId, null);
  setDomTableId(tableId, getDomNode(this));

  var collection = data.collection;
  var createRoute = data.createRoute;
  var editRoute = data.editRoute;

  template.createItem = createItem;
  template.editItem = editItem;
  template.deleteItem = deleteItem;

  function createHandlerContext(extraArgs) {
    return _.extend({
      id: getSelectedId(tableId),
      selectedRow: getSelectedRow(tableId, template),
      collection: collection,
      createRoute: createRoute,
      editRoute: editRoute
    }, extraArgs);
  }

  function createItem() {
    console.log('createRoute', createRoute, settings.onCreate);
    settings.onCreate ? settings.onCreate(createHandlerContext()) : Router.go(createRoute);
  }

  function editItem(args) {
    var id = args.id || getSelectedId(tableId);
    var defaultHandler = function() {
      Router.go(editRoute, {_id: id});
    };
    console.log('editRoute', editRoute);
    console.log('settings', settings);
    if (settings.onEdit) {
      settings.onEdit(createHandlerContext(_.extend({defaultHandler: defaultHandler}, args)));
    } else {
      defaultHandler();
    }
  }

  function deleteItem() {
    if (confirm('Delete item?')) {
      settings.onDelete ? settings.onDelete(createHandlerContext()) :
          collection.remove(getSelectedId(tableId));
    }
  }
};

TemplateClass.events({
  'click table.selectable tbody tr': function(e, template) {
    var data = template.data;
    var tableId = data._tableId;
    var id = this._id;
    var deselectedId = deselect(tableId);
    if (deselectedId !== id) {
      setSelectedId(tableId, id);
    }
  },
  'dblclick table.selectable tbody tr': function(e, template) {
    var id = $(e.target).closest('tr').data('id');
    template.editItem({event: e, id: id, model: this});
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
    return {
      items: data.items || data.collection,
      tableSettings: _.defaults(data.settings, {
        rowsPerPage: 10,
        showFilter: true,
        useFontAwesome: true
      }),
      tableId: tableId
    };
  },
  selectionItemsStyle: function() {
    var data = this;
    var value = getSelectedId(data._tableId);
    return value ? '' : 'display: none';
  }
});
