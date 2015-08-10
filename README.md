# Meteor Collection Table

A CRUD table template for displaying collection items in Meteor. Extends [aslagle:reactive-table](https://github.com/aslagle/reactive-table) and uses [iron:router](https://github.com/iron-meteor/iron-router).

[Demo App](https://github.com/aramk/meteor-sandbox).

## Features

* CRUD buttons (Create, Edit, Delete) with custom behaviour.
* Selection
* Checkboxes

## Installation

	meteor add aramk:collection-table
	
## Template

Use in a template:

	{{> collectionTable collection='Products' settings=tableSettings}}

* `collection` - the name of a global variable referencing a collection, or a helper name returning a collection.
* `settings` - an object passed to [aslagle:reactive-table](https://github.com/aslagle/reactive-table) and accepts the same arguments with a few additions detailed below. Return this from a template helper.

## Settings

### Configuration

* `items` - a collection, cursor or array. `collection` and/or `items` must be provided.
* `fields` - an array of column definitions identical to reactive-table.
* `multiSelect` - a boolean for whether to allow multiple selections. True by default.
* `checkbox` - a boolean for whether to show checkboxes as the first column in a field called "checked".
* `showFilter` - a boolean for whether to show the filter text box in the toolbar.

### Callbacks

* `onCreate` - called when clicking the create button. By default it will re-route to `<collectionName>/create`.
* `onEdit` - called when clicking the edit button. By default it will re-route to `<collectionName>/:_id/edit` and pass `_id` as the document ID.
* `onDelete` - called when clicking the delete button. By default it will show an alert remove the selected document from the collection on a positive response and otherwise cancel the request.

All callbacks are passed the following object as the only argument:

* `ids` - the selected row IDs corresponding to the document IDs in the given collection.
* `selectedRows`- an array of jQuery objects for each row in the table.
* `collection` - the collection used in the table.
* `createRoute` - the name of the route to redirect to when invoking the create action.
* `editRoute` - the name of the route to redirect to when invoking the edit action.

