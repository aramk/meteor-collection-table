Package.describe({
  name: 'collection-table',
  summary: 'A CRUD table template for displaying collection items in Meteor.'
});

Package.on_use(function(api) {
  api.use(['templating', 'underscore', 'jquery', 'less', 'reactive-table'], 'client');

  api.add_files([
    'lib/collectionTable.html',
    'lib/collectionTable.js',
    'lib/collectionTable.less'
  ], 'client');
});
