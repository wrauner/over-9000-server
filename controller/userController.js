/* global callback */
/* User Controller */

var messages = require('../messages/messages.js');
var async = require('async');
var jwt = require('jsonwebtoken');
var express_jwt = require('express-jwt');

module.exports.controller = function(app, logger) {
    /* Setting secret */
    var secret = "testsecret";
    
    /**
     * Saving user data
     */
    var loginUser = function(req, res) {
        async.waterfall([
            function(callback) {
                if(req.params && req.params.nick) {
                    logger.info("Generating token for", req.params.nick);
                    callback(null, req.params.nick);
                } else {
                    callback(messages.loginEmpty);
                }
            },
            function(nick, callback) {
                var result = messages.loginResponse;
                result.token = jwt.sign(nick, secret, {expiresInMinutes: 60});
                res.send(result);
            }
        ], function(err) {
            logger.error("Error while logging user", err);
            res.send(err);
        });
    };

    app.get('/login/:nick', loginUser);
};