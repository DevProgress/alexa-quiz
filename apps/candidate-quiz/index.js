// jshint esversion: 6

var alexa = require('alexa-app');
var app = new alexa.app('candidatequiz');
var quiz = require('./quiz');
app.db = require('./db/mock-db');

function getDatabase() {
    return app.db;
}

app.launch(function(request, response) {
    app.db.loadSession(request.userId).then((savedSession) => {
        var say = [];
        var used = [];
        // copy saved session into current session
        var session = savedSession || {};
        console.log('session=', session);
        if (session) {
            var all = JSON.parse(session.all || '{}');
            used = Object.keys(all);
            Object.keys(session).forEach((key) => {
                response.session(key, savedSession[key]);
            });
            say.push('<s>Welcome back.  <break strength="medium" /></s>');
            say.push('<s>Next question:</s>');
        } else {
            say.push('<s>Welcome to candidate quiz twenty sixteen. <break strength="medium" /></s>');
            say.push('<s>First question:</s>');
        }
        // set current list of questions to empty
        response.session('current', '{}');
        var q = quiz.getNextQuestion(used);
        if (q) {
            say.push(q.questionAndAnswers());
            response.session('q', q.id);
            response.shouldEndSession(false, 'What do you think? Is it '+q.choices()+'?');
        } else {
            say.push("That's all the questions I have for now.  Remember to vote on November eighth.");
        }
        response.say(say.join('\n'));
        response.send();
    });
    return false;  // wait for promise to resolve
});

app.intent('AMAZON.HelpIntent', function(request, response) {
    response.say('Say repeat to hear the question again, or stop to end.');
    response.shouldEndSession(false);
});

app.intent('AMAZON.StopIntent', function(request, response) {
    var score = quiz.getScore(request.session('current') || {});
    var say = ['Thanks for playing candidate quiz. '];
    if (score) {
        say.push('You got '+correct+' correct. ');
    }
    // TODO: display questions and answers on card
    say.push('Remember to vote on November eighth.');
    response.say(say.join('\n'));
});

app.intent('RepeatIntent', function(request, response) {
    var q = quiz.getQuestion(request.session('q'));
    response.shouldEndSession(false, 'What do you think? Is it '+q.choices()+'?');
    response.say(q.questionAndAnswers());
});

app.intent('AnswerIntent',
    {
        // A B C true false
        'slots': { 'ANSWER': 'ANSWERS' },
        'utterances': [
            '{-|ANSWER}'
        ]
    },

    function(request, response) {
        var session = request.sessionDetails.attributes;
        console.log('answer session=', session);
        // {'1': 'A', '2': 'false'}
        var all = JSON.parse(request.session('all') || '{}');
        var current = JSON.parse(request.session('current') || '{}');
        var used = Object.keys(all);
        var currentQuestionId = request.session('q');
        var say = [];
        var q = currentQuestionId ? quiz.getQuestion(currentQuestionId) : null;
        console.log('answerIntent current=|'+currentQuestionId+'| used=|'+used+'|');
        var score = quiz.getScore(JSON.parse(request.session('current') || '{}'));
        // found question in session; check answer
        if (q) {
            var answer = request.slot('ANSWER');
            console.log('answer='+answer);
            app.db.logAnswer(currentQuestionId, answer);
            var sayAnswer = q.answer(answer);
            if (q.isCorrect(answer)) {
                say.push('<s>'+sayAnswer+' is correct!</s>');
                score += 1;
            } else {
                say.push('<s>The correct answer is '+q.answerText()+'.</s>');
            }
            say.push(q.explanation());
            // save question and answer to current and all questions
            current[currentQuestionId] = answer;
            all[currentQuestionId] = answer;
        }
        session.current = JSON.stringify(current);
        session.all = JSON.stringify(all);
        // get next question
        var next = quiz.getNextQuestion(Object.keys(all));
        if (next) {
            say.push('<s>Next question.</s>');
            say.push(next.questionAndAnswers());
            session.q = next.id;
            response.shouldEndSession(false, 'What do you think? Is it '+next.choices()+'?');
        } else {
            say.push("That's all the questions I have for now. You got "+score+
                " correct. Remember to vote on November eighth.");
        }
        Object.keys(session).forEach((key) => {
            response.session(key, session[key]);
        });
        app.db.saveSession(request.userId, session);
        response.say(say.join('\n'));
    }
);


if (process.argv.length > 2) {
    var arg = process.argv[2];
    if (arg === '-s' || arg === '--schema') {
        console.log(app.schema());
    }
    if (arg === '-u' || arg === '--utterances') {
        console.log(app.utterances());
    }
}

module.change_code=1;
module.exports = app;
