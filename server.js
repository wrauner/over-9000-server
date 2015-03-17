var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var winston = require('winston');

/* Config for RedHat OpenShift */
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var log_folder = process.env.OPENSHIFT_LOG_DIR || __dirname;

/* Setting up Winston for logging */
var logger = new(winston.Logger)({
  transports: [
    new(winston.transports.File)({
      filename: log_folder + '/server.log'
    })
  ]
});

/* Basic check */
app.get('/', function(req, res) {
  res.send('<h1>Working!!!</h1>');
});

/* Starting server */
app.listen(server_port, server_ip_address, function() {
  logger.log('info', "Listening on " + server_ip_address + ", server_port " +
    server_port);
});
