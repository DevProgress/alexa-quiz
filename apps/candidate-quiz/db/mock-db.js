var Promise = require('bluebird'),
    data = require('./mock-data.json');

module.exports = {
    label: 'mock',

    loadSession: function(userId) {
        console.log('mock-db.loadSession '+userId);
        return new Promise(function(resolve) {
            return resolve(data.users[userId]);
        });
    },

    saveSession: function(userId, session) {
        console.log('mock-db.saveSession '+userId);
        return new Promise(function(resolve) {
            var saved = data.users[userId] || {};
            return resolve(Object.assign(saved, session));
        });
    },

    logAnswer: function(questionId, answer) {
        console.log('mock-db.logAnswer '+questionId+'='+answer);
    },
};
