var selectedClass = 'selected';
var domNodeField = 'domNodeField';
var selectEventName = 'select';
var deselectEventName = 'deselect';
var idAttribute = 'data-id';
var TemplateClass = Template.collectionTable;

var nextId = 1;
function getNextId() {
  return nextId++;
}

function getRow(id, template) {
  return $(template.find('tr[' + idAttribute + '="' + id + '"]'));
}

function getSelectedRows(domNode, template) {
  return _.map(getSelectedIds(domNode), function(id) {
    getRow(id, template)
  });
}

function setSelectedIds(domNode, ids) {
  var selectedIds = getSelectedIds(domNode);
  var toDeselectIds = _.difference(selectedIds, ids);
  var toSelectIds = _.difference(ids, selectedIds);
  removeSelection(domNode, toDeselectIds);
  addSelection(domNode, toSelectIds);
}

function getSelectedIds(domNode) {
  return getTemplate(domNode).selectedIds.get();
}

function deselectAll(domNode) {
  var selectedIds = getSelectedIds(domNode);
  removeSelection(domNode, selectedIds);
  return selectedIds;
}

function toggleSelection(domNode, ids) {
  var selectedIds = getSelectedIds(domNode);
  var toDeselectIds = _.intersection(selectedIds, ids);
  var toSelectIds = _.difference(ids, selectedIds);
  removeSelection(domNode, toDeselectIds);
  addSelection(domNode, toSelectIds);
}

function addSelection(domNode, ids) {
  var selectedIds = getSelectedIds(domNode);
  var toSelectIds = _.difference(ids, selectedIds);
  if (toSelectIds.length === 0) return;
  var template = getTemplate(domNode);
  _.each(toSelectIds, function(id) {
    var $row = getRow(id, template);
    $row.addClass(selectedClass);
  });
  var newSelectedIds = _.union(selectedIds, toSelectIds);
  getTemplate(domNode).selectedIds.set(newSelectedIds);
  $(domNode).trigger(selectEventName, toSelectIds);
}

function removeSelection(domNode, ids) {
  var selectedIds = getSelectedIds(domNode);
  var toDeselectIds = _.intersection(selectedIds, ids);
  if (toDeselectIds.length === 0) return;
  var template = getTemplate(domNode);
  _.each(toDeselectIds, function(id) {
    var $row = getRow(id, template);
    $row.removeClass(selectedClass);
  });
  var newSelectedIds = _.difference(selectedIds, toDeselectIds);
  getTemplate(domNode).selectedIds.set(newSelectedIds);
  $(domNode).trigger(deselectEventName, toDeselectIds);
}

function getDomNode(template) {
  if (!template) throw new Error('No template provided');
  return template.find('.collection-table');
}

function getTemplate(domNode) {
  if (!domNode) throw new Error('No domNode provided');
  return Blaze.getView(domNode).templateInstance();
}

function setDomTableId(domNode, domNode) {
  $(domNode).data(domNodeField, domNode);
}

function getDomTableId(domNode) {
  return $(domNode).data(domNodeField);
}

function configureSettings(template) {
  var data = template.data;
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
  if (!items) {
    items = collection;
  }
  // Store them for use in helpers.
  template.items = items;
  template.collection = collection;
  if (!collection) {
    console.warn('No collection provided.', data);
  } else {
    var collectionName = data.collectionName || Collections.getName(collection);
    if (collectionName) {
      var collectionId = Strings.firstToLowerCase(Strings.singular(collectionName));
      template.createRoute = data.createRoute || collectionId + 'Item';
      template.editRoute = data.editRoute || collectionId + 'Edit';
    } else {
      console.warn('No collection name provided', data);
    }
  }
}

// Exports

// We cannot use references alone since they are obfuscated during minification, so we need to
// name them.
var methods = {
  getRow: getRow,
  getSelectedRows: getSelectedRows,
  setSelectedIds: setSelectedIds,
  getSelectedIds: getSelectedIds,
  deselectAll: deselectAll,
  toggleSelection: toggleSelection,
  addSelection: addSelection,
  removeSelection: removeSelection,
  getDomNode: getDomNode,
  setDomTableId: setDomTableId,
  getDomTableId: getDomTableId
};
_.extend(TemplateClass, methods);

// Template methods.

TemplateClass.created = function() {
  // var data = this.data;
  // data._template = this;
  this.tableId = getNextId();
  this.selectedIds = new ReactiveVar([]);
  configureSettings(this);
};

TemplateClass.rendered = function() {
  var $table = $(this.findAll('.reactive-table')).addClass('ui selectable table segment');

  // Place the filter in the toolbar. To ensure the reactive-table filtering logic is used, we must
  // sync the values between the duplicate and the original, since the original event handler
  // only fires when the original element is in its original position.
  var $origFilter = $(this.findAll('.reactive-table-filter'));
  var $filter = $origFilter.clone();
  $origFilter.hide();
  var $toolbar = $origFilter.prev('.toolbar');
  $('.right.menu', $toolbar).append($filter.addClass('item'));
  var $filterInput = $('input', $filter);
  var $origFilterInput = $('input', $origFilter);
  $filterInput.keyup(function() {
    $origFilterInput.val($filterInput.val());
    $origFilterInput.trigger('keyup');
  });

  $(this.findAll('input.form-control')).wrap('<div class="ui input"></div>');
  var $nav = $(this.findAll('.reactive-table-navigation'));
  var $footer = $('<tfoot><tr><th></th></tr></tfoot>');
  var colCount = $('tr:first th', $table).length;
  $('tr th', $footer).attr('colspan', colCount).append($nav);
  $('tbody', $table).after($footer);

  var template = this;
  var data = this.data;
  var domNode = getDomNode(this);
  var settings = data.settings;

  // setSelectedIds(domNode, []);
  setDomTableId(domNode, this.tableId);

  var collection = this.collection;
  var createRoute = this.createRoute;
  var editRoute = this.editRoute;

  template.createItem = createItem;
  template.editItem = editItem;
  template.deleteItem = deleteItem;

  function createHandlerContext(extraArgs) {
    return _.extend({
      ids: getSelectedIds(domNode),
      selectedRows: getSelectedRows(domNode, template),
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
      var ids = args.ids || getSelectedIds(domNode);
      var id = ids[0];
      typeof Router !== 'undefined' && Router.go(editRoute, {
        _id: id
      });
    };
    if (settings.onEdit) {
      settings.onEdit(createHandlerContext(_.extend({
        defaultHandler: defaultHandler
      }, args)));
    } else {
      defaultHandler();
    }
  }

  function deleteItem() {
    if (confirm('Delete item?')) {
      if (settings.onDelete) {
        settings.onDelete(createHandlerContext());
      } else {
        _.each(getSelectedIds(domNode), function(id) {
          collection.remove(id);
        })
      }
    }
  }
};

TemplateClass.events({
  'click table.selectable tbody tr': function(e, template) {
    var data = template.data;
    var domNode = getDomNode(template);
    var id = this._id;
    if (!e.metaKey) {
      deselectAll(domNode);
    }
    toggleSelection(domNode, [id]);
  },
  'dblclick table.selectable tbody tr': function(e, template) {
    var id = $(e.target).closest('tr').data('id');
    template.editItem({
      event: e,
      ids: [id],
      model: this
    });
  },
  'click .create.item': function(e, template) {
    template.createItem();
  },
  'click .edit.item': function(e, template) {
    template.editItem({
      event: e
    });
  },
  'click .delete.item': function(e, template) {
    template.deleteItem();
  }
});

TemplateClass.helpers({
  selectionItemsStyle: function() {
    var template = Template.instance();
    var selectedIds = template.selectedIds.get();
    return selectedIds.length > 0 ? '' : 'display: none';
  },
  items: function() {
    return Template.instance().items;
  },
  tableSettings: function() {
    var data = this;
    var settings = Setter.clone(data.settings);
    var tableId = Template.instance().tableId;
    return _.defaults(settings, {
      // Group is unique so session variables are never shared between tables.
      group: tableId,
      rowsPerPage: 10,
      showFilter: true,
      useFontAwesome: true
    });
  }
});
