/// <reference path="typings/node/node.d.ts"/>
/* global process */
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var winston = require('winston');
var bodyParser = require('body-parser');
var socketio_jwt = require('socketio-jwt');
var fs = require('fs');

/* Config for RedHat OpenShift */
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '192.168.0.4';
var log_folder = process.env.OPENSHIFT_LOG_DIR || __dirname;

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
function getClientListWithoutOne(socket) {
    var result = [];
    for(var i=0; i<clients.length; i++) {
        if(clients[i].id != socket.id) {
            result.push(createClientFromSocket(clients[i]));
        }
    }
    return result;
}

function createClientFromSocket(socket, key) {
    var client = {
        nick : socket.decoded_token,
        id : socket.id
    };
    if(key) {
        client.key = key;
    } else {
        client.key = "";
    }
    return client;
}

io.on('connection', function (socket) {
    logger.info("Client connected: "+socket.decoded_token+":"+socket.handshake.address);
    clients.push(socket);
    socket.emit('client_list', getClientListWithoutOne(socket));
    socket.broadcast.emit('new_client', createClientFromSocket(socket));
    
    socket.on('disconnect', function() {
        logger.info("Clienct disconnected:"+socket.decoded_token+":"+socket.handshake.address);
        clients.splice(clients.indexOf(socket), 1);
        io.sockets.emit('client_disconnected', createClientFromSocket(socket));
    });
    socket.on('connect_to_user', function(message) {
        var msg = JSON.parse(message);
        logger.info("Connecting "+socket.decoded_token+" to "+msg.socketId);
        io.to(msg.socketId).emit('connection_request', createClientFromSocket(socket, msg.key));
    });
    socket.on('accept_connection', function(message) {
        var msg = JSON.parse(message);
        logger.info("Connection accepted");
        io.to(msg.socketId).emit('connection_accepted', createClientFromSocket(socket, msg.key));
    });
    socket.on('send_message', function(message) {
        logger.info("Message:"+message+" from "+socket.decoded_token);
        var msg = JSON.parse(message);
        io.to(msg.to).emit('received_message', msg);
    });
    socket.on('get_users', function() {
        socket.emit('client_list', getClientListWithoutOne(socket));
    });
});

/* If something brakes */
process.on('uncaughtException', function(error) {
    logger.error("Uncaught exception", error);
});


