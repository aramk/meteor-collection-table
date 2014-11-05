Package.describe({
  name: 'collection-table',
  version: '0.1.0',
  summary: 'A CRUD table template for displaying collection items in Meteor.'
});

Package.on_use(function(api) {
  api.use(['templating', 'underscore', 'jquery', 'less', 'reactive-table', 'aramk:utility'],
      'client');

  api.add_files([
    'lib/collectionTable.html',
    'lib/collectionTable.js',
    'lib/collectionTable.less'
  ], 'client');
});
