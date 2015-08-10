Package.describe({
  name: 'aramk:collection-table',
  version: '0.4.0',
  summary: 'A CRUD table template for displaying collection items in Meteor.',
  git: 'https://github.com/aramk/meteor-collection-table.git'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.0');
  api.use([
    'coffeescript',
    'templating',
    'underscore',
    'jquery',
    'less',
    'reactive-var@1.0.3',
    'aslagle:reactive-table@=0.8.1',
    'aramk:utility@0.6.0'
  ], 'client');
  api.use(['iron:router@1.0.7'], 'client', {weak: true});
  api.add_files([
    'src/collectionTable.html',
    'src/collectionTable.coffee',
    'src/collectionTable.less'
  ], 'client');
});
