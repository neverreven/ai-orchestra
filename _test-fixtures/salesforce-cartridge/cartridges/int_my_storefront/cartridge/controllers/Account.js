// ai-orchestra fixture: minimal SFRA controller stub.
// Triggers the salesforce-sfra.mdc rule via the cartridges/**/*.js path.
'use strict';

var server = require('server');

server.get('Show', function (req, res, next) {
  res.render('account/show', { accountId: req.querystring.id });
  next();
});

module.exports = server.exports();
