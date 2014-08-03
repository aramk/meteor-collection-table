Package.describe({
  name: 'collection-table',
  summary: 'A CRUD table template for displaying collection items in Meteor.'
});

Package.on_use(function(api) {
  api.use([
    'reactive-table'
  ]);

  api.add_files([
    'collectionTable.js',
    'collectionTable.html',
    'collectionTable.less',
  ], 'client');
});
