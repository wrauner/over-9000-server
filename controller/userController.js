/* User Controller */
var messages = require('../messages/messages.js');
var async = require('async');
var jwt = require('jsonwebtoken');
var User = require('../models/User.js');

module.exports.controller = function(app, logger) {
    /* Setting secret */
    var secret = "testsecret";
    /* Registering user */
    var registerUser = function (req, res) {
        if (req.body) {
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

    /* Login user*/
    var loginUser = function(req, res) {

        function validateLoginData(callback) {
            logger.info("Validating data ", req.body);
            if (req.body) {
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
            User.findOne({email: userData.email}, function (err, user) {
                if (err) {
                    logger.error("Error while searching for user ", err);
                    callback(messages.loginError);
                }
                if (user) {
                    callback(null, user, userData);
                } else {
                    logger.error("Cannot find user ", userData.email);
                    callback(messages.loginCannotFindUser);
                }
            })
        }

        function compareHash(user, userData, callback) {
            logger.info("Checking password");
            if (userData.password === user.password) {
                callback(null, user);
            } else {
                logger.info("Invalid password for user ", userData.email);
                callback(messages.loginInvalidPassword);
            }
        }

        function checkToken(user, callback) {
            logger.info("Checking for token");
            if (user.token) {
                jwt.verify(user.token, secret, function (err) {
                    if (err) {
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
            user.save(function (err) {
                if (err) {
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
        ], function (err, user) {
            if (err) {
                logger.error("Error while logging user", err);
                res.send(err);
            }
            if (user) {
                logger.info("User logged in ", user.email);
                var message = messages.loginResponse;
                message.token = user.token;
                res.send(message);
            }
        });
    };
    app.post('/login', loginUser);
    app.post('/register', registerUser);
};