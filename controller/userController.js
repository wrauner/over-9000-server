/* User Controller */
var messages = require('../messages/messages.js');
var async = require('async');
var jwt = require('jsonwebtoken');
var User = require('../models/User.js');
var express_jwt = require('express-jwt');

module.exports.controller = function(app, logger, secret) {
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
                    res.send(messages.ok);
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
            //checkToken,
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

    var searchUser = function(req, res) {
        if(req.params && req.params.email) {
            logger.info("Searching: "+req.params.email);
            User.find({"email":req.params.email}, {'_id':0, 'name':1, 'lastname':1, 'email':1}, function(err, users) {
                if(err) {
                    logger.error("Error while searching for user", err);
                    res.send({"searchResultUsers": []});
                } else {
                    res.send({"searchResultUsers": users});
                }
            });
        }
    };

    var getFriends = function(req,res) {
        logger.info("Getting friends: " + req.user.email);
        async.waterfall([
            function(callback) {
                User.findOne({"email":req.user.email}, callback);
            },
            function(user, callback) {
                User.find().where('_id').in(user.friends).select('-_id email name lastname').exec(callback);
            }
        ], function(err, users) {
            if(err) {
                logger.error("Error while getting friends", err);
                res.send({"friends":[]});
            }
            if(users) {
                res.send({"friends": users});
            }
        });
    };


    var addFriend = function(req, res){
        async.waterfall([
            function(callback) {
                User.findOne({"email":req.params.email}, callback);
            },
            function(user, callback) {
                if(user.friends.length > 0) {
                    for(var i= 0, len = user.friends.length; i<len; i++) {
                        if(friend.email === req.user.email) {
                            return (callback(messages.friendAlreadyAdded));
                        }
                    }
                }
                return callback(null, user);
            },
            function(user, callback) {
                User.findOne({"email":req.user.email}, function(err, userRequesting) {
                    callback(err, user, userRequesting)
                });
            },
            function(user, userRequesting , callback) {
                user.friendRequests.push(userRequesting._id);
                user.save(callback);
            }
        ], function(err) {
            if(err) {
                logger.error("Error while adding friend", err);
                res.send(messages.friendAddingFailed)
            } else {
                logger.info("Request sent");
                res.send(messages.ok);
            }
        })
    };

    var getRequests = function(req, res) {
        logger.info(req.user.email+" getting requests");
        async.waterfall([
            function(callback) {
                User.findOne({email:req.user.email}, callback);
            },
            function(user, callback) {
                User.find().where('_id').in(user.friendRequests).select('-_id email name lastname').exec(callback);
            }
        ], function(err, users) {
              if(err) {
                  logger.error("Error while getting requests", err);
                  res.send({requests: []});
              } else {
                  res.send({requests: users});
              }
        });
    };

    var acceptRequest = function(req, res) {
        logger.info(req.user.email+ " accepted request from "+ req.params.email);
        async.waterfall([
            function(callback) {
                User.findOne({email:req.user.email}, callback);
            },
            function(userAccepting, callback) {
               User.findOne({email:req.params.email}, function(err, user) {
                   callback(err, userAccepting, user);
               });
            },
            function(userAccepting, userRequesting, callback) {
                userAccepting.friends.push(userRequesting._id);
                var index = -1;
                for (var i= 0, len=userAccepting.friendRequests.length; i<len; i++) {
                    if(userAccepting.friendRequests[i].id === userRequesting._id.id) {
                        index = i;
                        break;
                    }
                }
                if(index>-1) {
                    userAccepting.friendRequests.splice(index, 1);
                }
                userAccepting.save(function(err) {
                    callback(err, userAccepting, userRequesting)
                });
            },
            function(userAccepting, userRequesting, callback) {
                userRequesting.friends.push(userAccepting._id);
                userRequesting.save(callback);
            }
        ], function(err) {
            if(err) {
                logger.error("Failed to accept, error occured", err);
                res.send(messages.acceptFailed);
            } else {
                logger.info("Request accepted");
                res.send(messages.ok);
            }
        })
    };


    app.post('/login', loginUser);
    app.post('/register', registerUser);
    app.get('/search/:email', searchUser);
    app.get('/friends',express_jwt({secret: secret}), getFriends);
    app.put('/friends/requests/:email', express_jwt({secret: secret}), addFriend);
    app.get('/friends/requests', express_jwt({secret: secret}), getRequests);
    app.put('/friends/requests/accept/:email', express_jwt({secret: secret}), acceptRequest);
};