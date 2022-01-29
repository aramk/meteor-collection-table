templateName = 'collectionTable'
TemplateClass = Template[templateName]
selectedClass = 'selected'
domNodeField = 'domNodeField'
selectEventName = 'select'
crudMenuDisableClass = 'no-crud-menu'
toolbarDisableClass = 'no-toolbar'

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

getTemplate = (arg) ->
  if arg instanceof Blaze.TemplateInstance
    template = arg
  else
    element = $(arg)[0]
    if element
      return Blaze.getView(element).templateInstance()
  try
    Templates.getNamedInstance(templateName, template)
  catch err
    throw new Error('No element provided')

getSettings = (domNode) -> getTemplate(domNode).settings

setDomTableId = (domNode, id) -> $(domNode).data(domNodeField, id)

getDomTableId = (domNode) -> $(domNode).data domNodeField

createCheckbox = (value, object, checkbox) ->
  getValue = checkbox?.getValue
  if getValue
    value = getValue(object)
  checked = if value then 'checked' else ''
  html = '<input type="checkbox" ' + checked + ' />'
  Spacebars.SafeString(html)

configureSettings = (template) ->
  data = template.data

  # Clone settings to ensure the original isn't modified in case it's used across different table
  # instances.
  settings = _.extend(_.omit(data, 'settings'), Setter.clone(data.settings, shallow: true))
  tableId = template.tableId = settings.id ? getNextId()
  _.defaults settings,
    group: tableId
    rowsPerPage: 10
    showFilter: true
  template.settings = settings

  template.createRoute = settings.createRoute
  template.editRoute = settings.editRoute

  items = settings.items
  collection = settings.collection
  serverCollection = settings.serverCollection
  unless collection
    if items
      collection = Collections.get(items)
    else unless serverCollection
      throw new Error('Either or both of "items" and "collection" attributes must be provided.')
  else
    collection = Collections.get(collection)
  unless items
    items = collection
  unless collection or serverCollection
    console.warn 'No collection provided.', data
  else
    collectionName = settings.collectionName ? Collections.getName(collection)
    if collectionName
      collectionId = Strings.firstToLowerCase(Strings.singular(collectionName))
      template.createRoute ?= collectionId + 'Create'
      template.editRoute ?= collectionId + 'Edit'
    else
      console.warn 'No collection name provided', data

  template.items = items
  template.collection = collection

  # Pass items instead of the actual collection to allow using cursors and arrays.
  settings.collection = if settings.items? then items else serverCollection ? collection
  fields = settings.fields = settings.fields ? []
  checkbox = settings.checkbox
  if checkbox
    checkboxField =
      key: 'checked'
      label: ''
      fn: (value, object) -> createCheckbox(value, object, checkbox)
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

  # Restore the page number when revisiting the table.
  if settings.id
    currentPageSessionName = "collection-table-current-page-#{settings.id}"
    settings.currentPage = new ReactiveVar(Session.get(currentPageSessionName) || 0);
    Templates.bindVarToSession settings.currentPage, currentPageSessionName, template: template

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
  createCheckbox: createCheckbox

# Template methods.

TemplateClass.created = ->
  @selectedIds = new ReactiveVar([])
  @collectionHookHandles = []
  configureSettings(@)

TemplateClass.rendered = ->
  @tableInterval = setInterval =>
    if @$('.reactive-table').length > 0
      clearInterval(@tableInterval)
      onTableRender.call(@)
  , 100
  
onTableRender = ->
  template = @
  data = @data
  domNode = getDomNode(@)
  settings = getSettings(@)

  $table = @$('.reactive-table').addClass('ui selectable table segment ' + (settings.cls ? ''))
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
      ids = args.ids ? getSelectedIds(domNode)
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
        _.each getSelectedIds(domNode), (id) ->
          collection.remove id, (err, result) ->
            if err then Logger.error(err)

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
  if settings.toolbar == false
    $collectionTable.addClass toolbarDisableClass
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
    @autorun =>
      @collectionHookHandles.push collection.after.remove (userId, doc) ->
        removeSelection domNode, [doc._id]

  if settings.editOnSelect
    @autorun =>
      ids = @selectedIds.get()
      unless _.isEmpty(ids) then @editItem(ids: ids)

  # Bind double tap in place of double click for touch devices.
  $collectionTable.doubletap (e) ->
    tr = if $(e.target).is('tr') then e.target else $(e.target).closest('tr')[0]
    return unless tr
    data = Blaze.getData(tr)
    template.editItem
      event: e
      ids: [data._id]
      model: data

TemplateClass.destroyed = ->
  _.each @collectionHookHandles, (handle) -> handle.remove()
  clearInterval(@tableInterval)

TemplateClass.events
  'click table.selectable tbody tr': (e, template) ->
    # Prevent clicks on inputs from selecting the row.
    return if $(e.target).is('input')
    
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
      ids: [id]
      model: this
  'click .create.item': (e, template) -> template.createItem()
  'click .edit.item': (e, template) -> template.editItem event: e
  'click .delete.item': (e, template) -> template.deleteItem()
  'change [type="checkbox"]': (e, template) ->
    settings = template.settings
    if settings.checkbox
      $checkbox = $(e.currentTarget)
      data = Blaze.getData($checkbox.parent().parent()[0])
      $table = $(getDomNode(template))
      $table.trigger 'check',
        $table: $table
        $checkbox: $checkbox
        data: data
        checked: $checkbox.is(':checked')

TemplateClass.helpers
  selectedClass: ->
    template = Template.instance()
    selectedIds = template.selectedIds.get()
    if selectedIds.length > 0 then 'selected'
  items: -> Template.instance().items
  tableId: -> Template.instance().tableId
  tableSettings: -> Template.instance().settings
  showFilter: -> Template.instance().showFilter
