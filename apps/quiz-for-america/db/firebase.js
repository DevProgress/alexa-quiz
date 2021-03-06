var firebase = require('firebase');
var config = require('./config.json');
var md5 = require('md5');

firebase.initializeApp({
    serviceAccount: {
        projectId: config.project_id,
        clientEmail: config.client_email,
        privateKey: config.private_key
    },
    databaseURL: config.databaseURL
});

/*
    users: {
        user1: {
            q: currentQuestionId,
            all: {'1': 'A', '2': 'false'},  // all questions and answers
            current: {'3': 'A', '4': 'false'}  // current session questions and answers
        }
    },
    logs: {
        questions: {
            1: {
                A: 3,
                B: 7,
                C: 4
            }
        }
    }
*/

module.exports = {
    label: 'firebase',

    loadSession: function(userId) {
        var uid = md5(userId);
        console.log('load session for ', uid);
        var ref = firebase.database().ref('/sessions/'+uid);
        return ref.once('value').then(function(snapshot) {
            console.log('load: uid='+uid+' saved=', snapshot.val());
            return snapshot.val();
        });
    },

    saveSession: function(userId, session) {
        var uid = md5(userId);
        console.log('save session for ', uid);
        var ref = firebase.database().ref('/sessions/'+uid);
        return ref.set(session);
    },

    logAnswer: function(questionId, answer) {
        console.log('logAnswer: question='+questionId+' answer='+answer);
        var ref = firebase.database().ref('/logs/questions/'+questionId);
        ref.transaction(function(q) {
            if (q) {
                if (q[answer]) {
                    q[answer] += 1;
                } else {
                    q[answer] = 1;
                }
            } else {
                q = {};
                q[answer] = 1;
            }
            return q;
        });
    },
};
