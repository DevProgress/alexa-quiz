var app = require('index');
app.db = require('./db/firebase');

exports.handler = app.lambda();
