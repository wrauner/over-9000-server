var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mongoose = require('mongoose');
var winston = require('winston');
var User = require(__dirname+'/models/User.js');
var messages = require(__dirname+'/messages/messages.js');
var async = require('async');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var socketio_jwt = require('socketio-jwt');

/* Config for RedHat OpenShift */
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '192.168.0.4';
var log_folder = process.env.OPENSHIFT_LOG_DIR || __dirname;
var mongo_db = process.env.OPENSHIFT_MONGODB_DB_URL || 'localhost/over9000';

/* Setting middleware */
app.use(bodyParser.json());

/* Setting secret */
var secret = "testsecret";

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

/* Registering user */
var registerUser = function (req, res) {
    if(req.body) {
        logger.info("Registering user");
        var user = new User(req.body);
        user.save(function (err, user) {
            if (err) {
                if (err.code == 11000) {
                    logger.error("User already exists", user.email);
                    res.send(messages.userExists);
                } else {
                    logger.error("Registration error", err);
                    res.send(messages.registrationError);
                }
            }
            else {
                logger.info("Registered user", user.email);
                res.send(messages.registrationOk);
            }
        })
    } else {
        logger.error("Empty registration request");
        res.send(messages.registrationEmpty);
    }
};
app.post('/register', registerUser);

/* Login user*/
function loginUser(req, res) {

    function validateLoginData(callback) {
        logger.info("Validating data ", req.body);
        if(req.body) {
            var userData = req.body;
            if (!userData.email || !userData.password) {
                logger.error("Invalid login data ", req.body);
                callback(messages.loginError);
            } else {
                callback(null, userData);
            }
        } else {
            callback(messages.loginEmpty);
        }
    }

    function findUser(userData, callback) {
        logger.info("Searching for user ", userData.email);
        User.findOne({email: userData.email}, function(err, user) {
            if(err) {
                logger.error("Error while searching for user ", err);
                callback(messages.loginError);
            }
            if(user) {
                callback(null, user, userData);
            } else {
                logger.error("Cannot find user ", userData.email);
                callback(messages.loginCannotFindUser);
            }
        })
    }

    function compareHash(user, userData, callback) {
        logger.info("Checking password");
        if(userData.password === user.password) {
            callback(null, user);
        } else {
            logger.info("Invalid password for user ", userData.email);
            callback(messages.loginInvalidPassword);
        }
    }

    function checkToken(user, callback) {
        logger.info("Checking for token");
        if(user.token) {
            jwt.verify(user.token, secret, function(err) {
                if(err) {
                    callback(null, user);
                } else {
                    logger.error("User is already authenticated ", user.email);
                    callback(messages.loginAlreadyAuthenticated);
                }
            });
        } else {
            callback(null, user);
        }
    }

    function generateNewToken(user, callback) {
        logger.info("Generating new token for user ", user.email);
        var payload = {
            email: user.email,
            name: user.name,
            lastname: user.lastname
        };
        user.token = jwt.sign(payload, secret, {expiresInMinutes: 60});
        user.save(function(err) {
            if(err) {
                logger.error("Error while saving user ", user.email);
                callback(messages.errorWhileSaving);
            } else {
                callback(null, user);
            }
        })
    }

    /* Let it rain */
    async.waterfall([
        validateLoginData,
        findUser,
        compareHash,
        checkToken,
        generateNewToken
    ], function(err, user) {
        if(err) {
            logger.error("Error while logging user", err);
            res.send(err);
        }
        if(user) {
            logger.info("User logged in ", user.email);
            var message = messages.loginResponse;
            message.token = user.token;
            res.send(message);
        }
    });
};
app.post('/login', function(req, res) {loginUser(req,res)});

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
    logger.info("Client connected: "+socket.handshake.address);
});

/* If something brakes */
process.on('uncaughtException', function(error) {
    logger.error("Uncaught exception", error);
});


