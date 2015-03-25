/**
 * Created by wrauner on 20.03.15.
 */

module.exports = {
    registrationOk: {error: "0", description:"ok"},
    userExists: {error: "1", description:"user already exists"},
    registrationError: {error: "2", description:"registration error"},
    loginInvalidData: {error: "3", description:"invalid login data"},
    loginCannotFindUser: {error: "4", description: "cannot find user"},
    loginError: {error:"5", description: "error while searching for user"},
    loginInvalidPassword: {error:"6", description: "invalid password"},
    loginAlreadyAuthenticated: {error:"7", description: "already authenticated"},
    errorWhileSaving: {error:"8", description: "error while saving user"},
    loginResponse: {error: "0", description: "ok", token:""}
};