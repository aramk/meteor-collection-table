Package.describe({
  name: 'aramk:collection-table',
  version: '0.2.2',
  summary: 'A CRUD table template for displaying collection items in Meteor.',
  git: 'https://github.com/aramk/meteor-collection-table.git'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.0');
  api.use(['templating', 'underscore', 'jquery', 'less', 'reactive-var@1.0.3',
    'aslagle:reactive-table@0.4.2', 'aramk:utility@0.3.0'], 'client');
  api.add_files([
    'lib/collectionTable.html',
    'lib/collectionTable.js',
    'lib/collectionTable.less'
  ], 'client');
});
