var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var winston = require('winston');
var bodyParser = require('body-parser');
var socketio_jwt = require('socketio-jwt');
var fs = require('fs');

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

/* Setting up database connection */
mongoose.connect(mongo_db);
var db = mongoose.connection;
db.on('error',function(error) {
    logger.error("Error while connecting to db at: "+mongo_db, error);
});
db.once('open', function () {
    logger.info("Successfuly connected to db at: "+mongo_db);
});

/* Basic check */
app.get('/', function(req, res) {
  res.send('<h1>Working!!!</h1>');
});

/* Setting up controllers */
fs.readdirSync('./controller').forEach(function (file) {
    if(file.substr(-3) == '.js') {
        route = require('./controller/' + file);
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

io.on('connection', function (socket) {
    logger.info("Client connected: "+socket.decoded_token.email+":"+socket.handshake.address);
    socket.on('disconnect', function() {
        logger.info("Clienct disconnected:"+socket.decoded_token.email+":"+socket.handshake.address);
    });
    socket.on('SEND_MESSAGE', function(msg) {
        logger.info("Message:"+msg+" from "+socket.decoded_token.email);
        io.emit('RECEIVED_MESSAGE', JSON.parse(msg));
    });
});

/* If something brakes */
process.on('uncaughtException', function(error) {
    logger.error("Uncaught exception", error);
});


