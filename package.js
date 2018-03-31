Package.describe({
  name: 'aramk:collection-table',
  version: '1.0.0',
  summary: 'A CRUD table template for displaying collection items in Meteor.',
  git: 'https://github.com/aramk/meteor-collection-table.git'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@1.6.1');
  api.use([
    'coffeescript@1.2.3',
    'templating@1.3.2',
    'underscore',
    'jquery',
    'less',
    'aramk:jquery-doubletap@0.1.0',
    'aslagle:reactive-table@0.8.1',
    'matb33:collection-hooks@0.8.0',
    'reactive-var@1.0.3',
    'urbanetic:utility@2.0.0'
  ], 'client');
  api.use(['iron:router@1.0.13'], 'client', {weak: true});
  api.add_files([
    'src/collectionTable.html',
    'src/collectionTable.coffee',
    'src/collectionTable.less'
  ], 'client');
});
