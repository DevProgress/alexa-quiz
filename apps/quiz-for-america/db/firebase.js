var firebase = require('firebase');
var config = require('./config.json');

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

function keyify(userId) {
    return userId.replace(/\W+/g, '_');
}

module.exports = {
    label: 'firebase',

    loadSession: function(userId) {
        var uid = keyify(userId);
        var ref = firebase.database().ref('/sessions/'+uid);
        return ref.once('value').then(function(snapshot) {
            console.log('load: uid='+uid+' saved=', snapshot.val());
            return snapshot.val();
        });
    },

    saveSession: function(userId, session) {
        var uid = keyify(userId);
        var ref = firebase.database().ref('/sessions/'+uid);
        return ref.once('value').then(function(snapshot) {
            var saved = snapshot.val() || {};
            saved = Object.assign(saved, session);
            console.log('save uid='+uid+' saved=', saved);
            ref.set(saved);
        });
    },

    logAnswer: function(questionId, answer) {
        console.log('logAnswer: question='+questionId+' answer='+answer);
        var ref = firebase.database().ref('/logs/questions/'+questionId);
        ref.transaction(function(q) {
            console.log('transaction: q=', q);
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
            console.log('transaction: done q=', q);
            return q;
        });
    },
};
