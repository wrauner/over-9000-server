/* User model for Mongoose */
var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true},
    name: String,
    lastname: String,
    nick: String,
    password: { type: String, required: true},
    token: String,
    friends: [String],
    messages: [String]
});

module.exports = mongoose.model('User', UserSchema);