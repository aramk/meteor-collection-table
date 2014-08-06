var nextId = 1;
function getNextId() {
  return nextId++;
}
var sessionId = '_collectionTable_';
var selectedClass = 'selected';
var TemplateClass = Template.collectionTable;

function setReactiveVar(tableId, name, value) {
  console.log('setting reactive variable', value);
  Session.set(getSessionVarName(tableId, name), value);
}

function getSessionVarName(tableId, name) {
  var value = sessionId + tableId + ':' + name;
  console.log('getSessionVarName', value);
  return sessionId + tableId + ':' + name;
}

function getReactiveVar(tableId, name) {
  return Session.get(getSessionVarName(tableId, name));
}

function getRow(id, template) {
  return $(template.find('[data-id="' + id + '"]'))
}

function getSelectedItem(tableId) {
  return getReactiveVar(tableId, 'selectedItem');
}

function setSelectedItem(tableId, item) {
  return setReactiveVar(tableId, 'selectedItem', item);
}

function getSelectedRow(template) {
  var id = getSelectedId();
  return id && getRow(id, template);
}

function getSelectedId(tableId) {
  var selectedItem = getSelectedItem(tableId);
  return selectedItem && selectedItem.model._id;
}

function getSelectedModel(tableId) {
  var selectedItem = getSelectedItem(tableId);
  return selectedItem && selectedItem.model;
}

var tableSettings = {};

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
}

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
  var settings = data.settings;
  tableSettings[data._tableId] = settings;

  var collection = data.collection;
  var createRoute = data.createRoute;
  var editRoute = data.editRoute;

  template.createItem = createItem;
  template.editItem = editItem;
  template.deleteItem = deleteItem;

  function createHandlerContext(extraArgs) {
    return _.extend({id: getSelectedId(), selectedRow: getSelectedRow(), model: getSelectedModel(),
      collection: collection, createRoute: createRoute, editRoute: editRoute}, extraArgs);
  }

  function createItem() {
    console.log('createRoute', createRoute, settings.onCreate);
    settings.onCreate ? settings.onCreate(createHandlerContext()) : Router.go(createRoute);
  }

  function editItem(args) {
    var defaultHandler = function() {
      Router.go(editRoute, {_id: getSelectedId()});
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
          collection.remove(getSelectedId());
    }
  }
};

TemplateClass.events({
  'click table.selectable tbody tr': function(e, template) {
    var data = template.data;
    var tableId = data._tableId;
    var model = this;
    var $row = $(e.target).closest('tr');
    console.log('click', this, arguments);
    var selectedItem = getSelectedItem(tableId);
    if (selectedItem) {
      var $selectedRow = getRow(selectedItem.model._id, template);
      console.log('$selectedRow', $selectedRow);
      $selectedRow.removeClass(selectedClass);
      if ($selectedRow.is($row)) {
        // Deselection.
        setSelectedItem(tableId, null);
        return;
      }
    }
    var item = {
      model: model
    };
    console.log('item', item);
    $row.addClass(selectedClass);
    setSelectedItem(tableId, item);
  },
  'dblclick table.selectable tbody tr': function(e, template) {
    var id = $(e.target).closest('tr').data('id');
    template.editItem({event: e, id: id, model: this});
  },
  'click .create.item': function(e, template) {
    template.createItem();
  },
  'click .edit.item': function(e, template) {
    template.editItem();
  },
  'click .delete.item': function(e, template) {
    template.deleteItem();
  }
});

TemplateClass.helpers({
  _settings: function() {
    var data = this;
    var tableId = data._tableId;
    configureSettings(data);
    setSelectedItem(tableId, null);
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
  selectedItem: function() {
    var data = this;
    return getSelectedItem(data._tableId);
  },
  selectionItemsStyle: function() {
    var data = this;
    var value = getSelectedItem(data._tableId);
    console.log('value', value);
    return value ? '' : 'display: none';
  }
});
