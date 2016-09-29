// jshint esversion: 6

var alexa = require('alexa-app');
var app = new alexa.app('quizforamerica');
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
    if (!ids.length) {
        card.content = 'No results for this session.';
        return card;
    }
    var content = 'You got '+quiz.getScore(current)+' of '+ids.length;
    content += ids.length === 1 ? ' question' : ' questions';
    content += ' correct.\n';
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
        content += '\n'+question.q.explanation;
        if (question.q.source) {
            content += ' (source: '+question.q.source+')';
        }
        content += '\n';
    });
    content += '\nContent created by volunteers with DevProgress\n';
    content += 'http://devprogress.us\n';
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
    console.log('launch');
    app.db.loadSession(request.userId).then((savedSession) => {
        console.log('loaded session ', savedSession);
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
        }
        say.push('<s>Welcome to Quiz for America. <break strength="medium" /></s>');
        if (!savedSession) {
            say.push('<s>Each quiz has ten questions.</s>');
            say.push("<s>I'll ask a multiple choice or true false question.</s>");
            say.push('<s>Say true, false, or the letter matching your answer.</s>');
            say.push('<s>To hear a question again, say repeat.</s>');
            say.push('<s>Say stop <break strength="medium" /> to end the quiz early.</s>');
        }
        say = say.concat(app.startQuiz(response, used));
        response.say(say.join('\n'));
        response.send();
    });
    return false;  // wait for promise to resolve
});

app.intent('AMAZON.HelpIntent', function(request, response) {
    response.say('Say repeat <break strength="medium" /> to hear the question again, or stop <break strength="medium" /> to end.');
    response.shouldEndSession(false);
});

app.stopOrCancel = function(request, response) {
    var current = JSON.parse(request.session('current') || '{}');
    var score = quiz.getScore(current);
    var say = ['Thanks for playing Quiz for America. '];
    if (Object.keys(current).length) {
        say.push('<s>You got '+score+' questions correct.</s>');
        say.push('<s>Check your Alexa app for detailed results.</s>');
        response.card(app.card(current));
    }
    say.push('<s>Remember to vote on November eighth.</s>');
    response.say(say.join('\n'));
};

app.intent('AMAZON.StopIntent', function(request, response) {
    app.stopOrCancel(request, response);
});

app.intent('AMAZON.CancelIntent', function(request, response) {
    app.stopOrCancel(request, response);
});

app.intent('QuizMeOnIntent',
    {
    "slots":{"QUESTION_NUMBER":"NUMBER"},
    "utterances":[ "quiz me on question {1-200|QUESTION_NUMBER}" ]
    },
    function(request, response) {
      var session = request.sessionDetails.attributes;
      var questionNumber = request.slot('QUESTION_NUMBER');
      if (quiz.isAskable(questionNumber)) {
        // provide the question
        var q = quiz.getQuestion(questionNumber);
        var say =["<s>Ok, here's question " + questionNumber + " <break strength=\"medium\" /></s>"];
        response.shouldEndSession(false, 'What do you think? Is it '+q.choices()+'?');
        say.push(q.questionAndAnswers());
        var myResponse = say.join('\n');
        response.say(myResponse);
        session.q = q.id;
      } else {
        var say ="<s>Sorry, I don't know question " + questionNumber + " <break strength=\"medium\" /></s>";
        response.shouldEndSession(false, 'Ask me for another quiz or to quiz you on another question number.');
        response.say(say);
        session.q = null;
      }

      // session management
      Object.keys(session).forEach((key) => {
          response.session(key, session[key]);
      });
      app.db.saveSession(request.userId, session).then(() => {
          console.log('saved session');
          response.send();
      });
});

app.intent('CardIntent', function(request, response) {
    response.card(app.card(JSON.parse(request.session('current') || '{}')));
    response.say('Your results have been sent to the Alexa app.');
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
        // {'1': 'A', '2': 'false'}
        var all = JSON.parse(request.session('all') || '{}');
        var current = JSON.parse(request.session('current') || '{}');
        var used = Object.keys(all);
        var currentQuestionId = request.session('q');
        console.log('answer question='+currentQuestionId+' session=', session);
        var say = [];
        var q = currentQuestionId ? quiz.getQuestion(currentQuestionId) : null;
        var score = quiz.getScore(JSON.parse(request.session('current') || '{}'));
        // found question in session; check answer
        if (q) {
            var answer = request.slot('ANSWER') || 'X';
            answer = answer.slice(0, 1).toUpperCase();
            if (q.validAnswers().indexOf(answer) < 0) {
                answer = 'X';
            }
            console.log('answer normalized='+answer);
            app.db.logAnswer(currentQuestionId, answer);
            var sayAnswer = q.answer(answer);
            if (q.isCorrect(answer)) {
                say.push("<s>That's correct!</s>");
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
        var numQuestions = Object.keys(current).length;
        console.log('questions=', numQuestions);
        if (numQuestions === 10) {
            say.push("<s>Congratulations! You've answered ten questions.</s>");
            say.push('<s>Check your Alexa app for detailed results.</s>');
            say.push('<s>To start another quiz, say <break strength="x-strong" /> another.</s>');
            say.push("<s>Don't forget to vote on November eighth.</s>");
            response.card(app.card(current));
        } else {
            // get next question
            var next = quiz.getNextQuestion(Object.keys(all));
            if (next) {
                say.push('<s>Question '+(numQuestions+1)+'. <break strength="x-strong" /></s>');
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
        app.db.saveSession(request.userId, session).then(() => {
            response.say(say.join('\n'));
            response.send();
        });
        return false;
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
