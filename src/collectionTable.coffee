TemplateClass = Template.collectionTable
selectedClass = 'selected'
domNodeField = 'domNodeField'
selectEventName = 'select'
crudMenuDisableClass = 'no-crud-menu'

getNextId = -> Collections.generateId()

getRow = (id, template) ->
  row = _.find template.$('tbody tr'), (tr) ->
    data = Blaze.getData(tr)
    data._id == id
  $(row)

getSelectedRows = (domNode, template) -> _.map getSelectedIds(domNode), (id) -> getRow id, template

setSelectedIds = (domNode, ids) ->
  selectedIds = getSelectedIds(domNode)
  toDeselectIds = _.difference(selectedIds, ids)
  toSelectIds = _.difference(ids, selectedIds)
  removeSelection domNode, toDeselectIds
  addSelection domNode, toSelectIds

getSelectedIds = (domNode) -> getTemplate(domNode).selectedIds.get()

deselectAll = (domNode) ->
  selectedIds = getSelectedIds(domNode)
  removeSelection domNode, selectedIds
  selectedIds

toggleSelection = (domNode, ids) ->
  selectedIds = getSelectedIds(domNode)
  toDeselectIds = _.intersection(selectedIds, ids)
  toSelectIds = _.difference(ids, selectedIds)
  removeSelection domNode, toDeselectIds
  addSelection domNode, toSelectIds

addSelection = (domNode, ids) ->
  template = getTemplate(domNode)
  settings = getSettings(domNode)
  selectedIds = getSelectedIds(domNode)
  toSelectIds = _.difference(ids, selectedIds)
  return if toSelectIds.length == 0
  newSelectedIds = _.union(selectedIds, toSelectIds)
  if settings.multiSelect == false
    deselectAll domNode
    if newSelectedIds.length > 1
      newSelectedIds = toSelectIds = [ ids[0] ]
  _.each toSelectIds, (id) ->
    $row = getRow(id, template)
    $row.addClass selectedClass
  template.selectedIds.set newSelectedIds
  $(domNode).trigger selectEventName,
    added: toSelectIds
    removed: []

removeSelection = (domNode, ids) ->
  selectedIds = getSelectedIds(domNode)
  toDeselectIds = _.intersection(selectedIds, ids)
  return if toDeselectIds.length == 0
  template = getTemplate(domNode)
  _.each toDeselectIds, (id) ->
    $row = getRow(id, template)
    $row.removeClass selectedClass
  newSelectedIds = _.difference(selectedIds, toDeselectIds)
  getTemplate(domNode).selectedIds.set newSelectedIds
  $(domNode).trigger selectEventName,
    added: []
    removed: toDeselectIds

getDomNode = (template) ->
  if !template
    throw new Error('No template provided')
  template.find '.collection-table'

getTemplate = (domNode) ->
  if !domNode
    throw new Error('No domNode provided')
  domNode = $(domNode)[0]
  Blaze.getView(domNode).templateInstance()

getSettings = (domNode) -> getTemplate(domNode).settings

setDomTableId = (domNode, id) -> $(domNode).data(domNodeField, id)

getDomTableId = (domNode) -> $(domNode).data domNodeField

configureSettings = (template) ->
  data = template.data
  items = data.items
  collection = data.collection
  if !collection
    if items
      collection = Collections.get(items)
    else
      throw new Error('Either or both of "items" and "collection" attributes must be provided.')
  else
    collection = Collections.get(collection)
  if !items
    items = collection
  # Store them for use in helpers.
  template.items = items
  template.collection = collection
  if !collection
    console.warn 'No collection provided.', data
  else
    collectionName = data.collectionName or Collections.getName(collection)
    if collectionName
      collectionId = Strings.firstToLowerCase(Strings.singular(collectionName))
      template.createRoute = data.createRoute or collectionId + 'Create'
      template.editRoute = data.editRoute or collectionId + 'Edit'
    else
      console.warn 'No collection name provided', data

  tableId = template.tableId
  # Clone settings to ensure the original isn't modified in case it's used across different table
  # instances.
  settings = Setter.merge({
    group: tableId
    rowsPerPage: 10
    showFilter: true
  }, Setter.clone(data.settings))
  fields = settings.fields = settings.fields or []
  checkbox = settings.checkbox
  if checkbox
    checkboxField = 
      key: 'checked'
      label: ''
      fn: (value, object) ->
        getValue = checkbox.getValue
        if getValue
          value = getValue(object)
        checked = if value then 'checked' else ''
        html = '<input type="checkbox" ' + checked + ' />'
        new (Spacebars.SafeString)(html)
    if Types.isObject(checkbox.field)
      _.extend checkboxField, checkbox.field
    fields.unshift checkboxField
  # Legacy support for "sort" property.
  _.each fields, (field) ->
    sort = field.sort
    delete field.sort
    if sort? and !field.sortDirection?
      field.sortDirection = sort
      field.sortOrder = 0

  template.showFilter = settings.showFilter
  # We handle the filter ourselves.
  settings.showFilter = false
  settings.filters = [tableId]
  template.settings = settings

# Exports
# We cannot use references alone since they are obfuscated during minification, so we need to
# name them.
_.extend TemplateClass,
  getRow: getRow
  getSelectedRows: getSelectedRows
  setSelectedIds: setSelectedIds
  getSelectedIds: getSelectedIds
  deselectAll: deselectAll
  toggleSelection: toggleSelection
  addSelection: addSelection
  removeSelection: removeSelection
  getDomNode: getDomNode
  setDomTableId: setDomTableId
  getDomTableId: getDomTableId

# Template methods.

TemplateClass.created = ->
  @tableId = getNextId()
  @selectedIds = new ReactiveVar([])
  configureSettings(@)

TemplateClass.rendered = ->
  template = this
  data = @data
  domNode = getDomNode(this)
  settings = data.settings
  $table = $(@$('.reactive-table')).addClass('ui selectable table segment')
  $collectionTable = @$('.collection-table')

  createHandlerContext = (extraArgs) ->
    _.extend {
      ids: getSelectedIds(domNode)
      selectedRows: getSelectedRows(domNode, template)
      collection: collection
      createRoute: createRoute
      editRoute: editRoute
    }, extraArgs

  createItem = ->
    if settings.onCreate
      settings.onCreate createHandlerContext()
    else
      typeof Router != 'undefined' and Router.go(createRoute)

  editItem = (args) ->
    defaultHandler = ->
      ids = args.ids or getSelectedIds(domNode)
      id = ids[0]
      typeof Router != 'undefined' and Router.go(editRoute, _id: id)
    if settings.onEdit
      settings.onEdit createHandlerContext(_.extend({ defaultHandler: defaultHandler }, args))
    else
      defaultHandler()

  deleteItem = ->
    if confirm('Delete item?')
      if settings.onDelete
        settings.onDelete createHandlerContext()
      else
        _.each getSelectedIds(domNode), (id) -> collection.remove id

  @$('.ui.filter.input .input-group-addon').replaceWith('<i class="filter icon"></i>')
  @$('input.form-control').each ->
    $em = $(@)
    unless $em.parent().hasClass('ui input') then $em.wrap('<div class="ui input"></div>')
  $nav = @$('.reactive-table-navigation')
  $footer = $('<tfoot><tr><th></th></tr></tfoot>')
  colCount = $('tr:first th', $table).length
  $('tr th', $footer).attr('colspan', colCount).append $nav
  $('tbody', $table).after $footer
  if settings.crudMenu == false
    $collectionTable.addClass crudMenuDisableClass
  else if settings.crudMenu instanceof ReactiveVar
    @autorun => $collectionTable.toggleClass crudMenuDisableClass, !settings.crudMenu.get()
  setDomTableId domNode, @tableId
  collection = @collection
  createRoute = @createRoute
  editRoute = @editRoute
  @createItem = createItem
  @editItem = editItem
  @deleteItem = deleteItem
  if collection
    @autorun ->
      Collections.observe collection, removed: (doc) ->
        removeSelection domNode, [ doc._id ]

  if settings.editOnSelect
    @autorun =>
      ids = @selectedIds.get()
      unless _.isEmpty(ids) then @editItem(ids: ids)

TemplateClass.events
  'click table.selectable tbody tr': (e, template) ->
    data = template.data
    domNode = getDomNode(template)
    id = @_id
    if !e.metaKey
      deselectAll domNode
    toggleSelection domNode, [ id ]
  'dblclick table.selectable tbody tr': (e, template) ->
    id = @_id
    template.editItem
      event: e
      ids: [ id ]
      model: this
  'click .create.item': (e, template) -> template.createItem()
  'click .edit.item': (e, template) -> template.editItem event: e
  'click .delete.item': (e, template) -> template.deleteItem()
  'change [type="checkbox"]': (e, template) ->
    settings = template.data.settings
    if settings.checkbox
      $checkbox = $(e.currentTarget)
      data = Blaze.getData($checkbox.parent().parent()[0])
      $table = $(getDomNode(template))
      $table.trigger 'check',
        $table: $table
        $checkbox: $checkbox
        data: data
        checked: $checkbox.is(':checked')
  'click [type="checkbox"]': (e, template) ->
    # Prevent the check from being considered as a click event on the row.
    e.stopPropagation()

TemplateClass.helpers
  selectionItemsStyle: ->
    template = Template.instance()
    selectedIds = template.selectedIds.get()
    if selectedIds.length > 0 then '' else 'display: none'
  items: -> Template.instance().items
  tableId: -> Template.instance().tableId
  tableSettings: -> Template.instance().settings
  showFilter: -> Template.instance().showFilter

