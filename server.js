var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var winston = require('winston');
var User = require(__dirname+'/models/User.js');
var messages = require(__dirname+'/messages/messages.js');

/* Config for RedHat OpenShift */
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';
var log_folder = process.env.OPENSHIFT_LOG_DIR || __dirname;
var mongo_db = process.env.OPENSHIFT_MONGODB_DB_URL || 'localhost/over9000';

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
    logger.error("Error while connecting to db at: "+mongo_url, error);
});
db.once('open', function () {
    logger.info("Successfuly connected to db at: "+mongo_url);
});

/* Basic check */
app.get('/', function(req, res) {
  res.send('<h1>Working!!!</h1>');
});

/* Starting server */
http.listen(server_port, server_ip_address, function() {
  logger.log('info', "Listening on " + server_ip_address + ", server_port " +
    server_port);
});

io.on('connection', function (socket) {
    logger.info("Client connected: "+socket.handshake.address);

    /* Registering user */
    socket.on('registerUser', function registerUser(data) {
        logger.info("Registering user", data);
        var user = new User(data);
        user.save(function(err, user) {
            if (err) {
                if(err.code == 11000) {
                    logger.error("User already exists", user.email);
                    socket.emit('registerResponse', messages.userExists);
                } else {
                    logger.error("Registration error", err);
                    socket.emit('registerResponse', messages.registrationError);
                }
            }
            else {
                logger.debug("Zarejestrowano",user.email);
                socket.emit('registerResponse', messages.registrationOk);
            }
        });
    });

});
