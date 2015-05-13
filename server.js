/// <reference path="typings/node/node.d.ts"/>
/* global process */
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var winston = require('winston');
var bodyParser = require('body-parser');
var socketio_jwt = require('socketio-jwt');
var fs = require('fs');
var async = require('async');

/* Config for RedHat OpenShift */
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
var log_folder = process.env.OPENSHIFT_LOG_DIR || __dirname;
var mongo_db = process.env.OPENSHIFT_MONGODB_DB_URL || 'localhost/over9000';

/* Setting secret */
var secret = "testsecret";

/* Setting middleware */
app.use(bodyParser.json());

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
  res.send('<h1>Working!</h1>');
});

/* Setting up controllers */
fs.readdirSync('./controller').forEach(function (file) {
    if(file.substr(-3) == '.js') {
        var route = require('./controller/' + file);
        route.controller(app, logger);
    }
});

/* Starting server */
http.listen(server_port, server_ip_address, function() {
  logger.log('info', "Listening on " + server_ip_address + ", server_port " +
    server_port);
});

/* Socket.io setup */
io.use(socketio_jwt.authorize({
    secret: secret,
    handshake: true
}));

/* Temp list of clients */
var clients = [];

/* Parsing clients */
function getClientList(socket) {
    var result = [];
    for(var i=0; i<clients.length; i++) {
        if(clients[i].socketid != socket.socketid) {
            var client;
            client.nick = clients[i].decoded_token.nick;
            client.socketId = clients[i].socketid;
            result.push(client);
        }
    }
    return result;
}

function createClientFromSocket(socket) {
    var client;
    client.nick = socket.decoded_token.nick;
    client.socketId = socket.socketid;
    return client;
}

io.on('connection', function (socket) {
    logger.info("Client connected: "+socket.decoded_token.nick+":"+socket.handshake.address);
    clients.push(socket);
    socket.emit('client_list', getClientList(socket));
    
    socket.on('disconnect', function() {
        logger.info("Clienct disconnected:"+socket.decoded_token.nick+":"+socket.handshake.address);
        clients.splice(clients.indexOf(socket), 1);
    });
    socket.on('connect_to_user', function(socketId) {
        logger.info("Connecting "+socket.decoded_token.nick+" to "+socketId);
        io.to(socketId).emit('connection_request', createClientFromSocket(socket));
    });
    socket.on('accept_connection', function(socketId) {
        logger.info("Connection accepted");
        io.to(socketId).emit('connection_accepted', createClientFromSocket(socket));
    });
    socket.on('send_message', function(msg) {
        logger.info("Message:"+msg+" from "+socket.decoded_token.nick);
        io.to(msg.to).emit('message', msg);
    });
    socket.on('get_users', function() {
        socket.emit('client_list', getClientList(socket));
    });
});

/* If something brakes */
process.on('uncaughtException', function(error) {
    logger.error("Uncaught exception", error);
});


