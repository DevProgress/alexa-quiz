// jshint esversion: 6

var alexa = require('alexa-app');
var app = new alexa.app('candidatequiz');
var quiz = require('./quiz');
app.db = require('./db/mock-db');

function getDatabase() {
    return app.db;
}

// don't let alexa-app swallow the error
app.error = function(e, request, response) {
    console.log(e);
    throw e;
};

app.card = function(current) {
    console.log('createCard: current=', current);
    // current: {'3': 'A', '4': 'false'}
    var card = {
        type: 'Simple',
        title: 'Quiz results'
    };
    var ids = Object.keys(current);
    var score = quiz.getScore();
    if (!ids.length) {
        card.content = 'No results for this session.';
        return card;
    }
    var content = 'You got '+quiz.getScore()+' of '+ids.length+' questions correct.\n';
    Object.keys(current).forEach((q) => {
        var question = quiz.getQuestion(q);
        var answer = current[q];
        var isCorrect = question.isCorrect(answer);
        var symbol = isCorrect ? '✔' : '✗';
        content += '\n'+symbol+' '+question.q.question+'\nAnswer: ';
        if (question.isBoolean()) {
            content += question.q.answer.toLowerCase();
        } else {
            content += question.q.answers[question.q.answer];
        }
        content += '\n'+question.q.explanation+'\n';
    });
    content += '\nContent created by volunteers with DevProgress http://devprogress.us';
    console.log('content', content);
    card.content = content;
    return card;
};

app.startQuiz = function(response, used) {
    var say = ['<s>First question:</s>'];
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
    return say;
};

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
            say.push('<s>Welcome back for another quiz. <break strength="medium" /></s>');
        } else {
            say.push('<s>Welcome to candidate quiz twenty sixteen. <break strength="medium" /></s>');
        }
        say = say.concat(app.startQuiz(response, used));
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
    var current = JSON.parse(request.session('current') || '{}');
    var score = quiz.getScore(current);
    var say = ['Thanks for playing candidate quiz. '];
    if (score) {
        say.push('You got '+correct+' correct. ');
    }
    say.push('Remember to vote on November eighth.');
    response.card(app.card(current));
    response.say(say.join('\n'));
});

app.intent('CardIntent', function(request, response) {
    response.card(app.card(JSON.parse(request.session('current') || '{}')));
    response.say('see card for results');
});

app.intent('RepeatIntent', function(request, response) {
    var q = quiz.getQuestion(request.session('q'));
    response.shouldEndSession(false, 'What do you think? Is it '+q.choices()+'?');
    response.say(q.questionAndAnswers());
});

app.intent('AnotherIntent', function(request, response) {
    var all = JSON.parse(request.session('all') || '{}');
    var say = ["<s>Ok. Let's start another quiz. <break strength=\"medium\" /></s>"];
    say = say.concat(app.startQuiz(response, Object.keys(all)));
    response.say(say.join('\n'));
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
        // if 10 questions, stop and send results
        console.log('questions=', Object.keys(current).length);
        if (Object.keys(current).length === 10) {
            response.say("<s>Congratulations! You've answered ten questions. "+
                'Check your Alexa app for detailed results. '+
                'To start another quiz, say another.'+
                "Don't forget to vote on November eighth.</s>");
            response.card(app.card(current));
        } else {
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
                response.card(app.card(current));
            }
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
