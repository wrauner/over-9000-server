/**
 * Created by wrauner on 20.03.15.
 */

module.exports = {
    ok: {error: "0", description:"ok"},
    userExists: {error: "1", description:"user already exists"},
    registrationError: {error: "2", description:"registration error"},
    loginInvalidData: {error: "3", description:"invalid login data"},
    loginCannotFindUser: {error: "4", description: "cannot find user"},
    loginError: {error:"5", description: "error while searching for user"},
    loginInvalidPassword: {error:"6", description: "invalid password"},
    loginAlreadyAuthenticated: {error:"7", description: "already authenticated"},
    errorWhileSaving: {error:"8", description: "error while saving user"},
    loginResponse: {error: "0", description: "ok", token:""},
    registrationEmpty: {error:"9", description: "empty registration request"},
    loginEmpty: {error:"10", description: "empty login request"},
    userNotFound: {error:"11", description: "user not found"},
    friendAlreadyAdded: {error:"12", description: "friend already added"},
    acceptFailed: {error:"13", description: "error while accepting friend request"},
    friendAddingFailed: {error:"14", description: "error while adding friend"}
};