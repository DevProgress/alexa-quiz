var alexa = require('alexa-app');
var app = new alexa.app('candidatequiz');
var quiz = require('./quiz');


app.launch(function(request, response) {
    var say = ['<s>Welcome to candidate quiz twenty sixteen. <break strength="medium" /></s>'];
    say.push('<s>First question:</s>');
    var q = quiz.getNextQuestion();
    if (q) {
        say.push(q.questionAndAnswers());
        response.session('q', q.id);
        response.shouldEndSession(false, 'What do you think? Is it '+q.choices()+'?');
    } else {
        say.push("That's all the questions I have for now.  Remember to vote on November eighth.");
    }
    response.say(say.join('\n'));
});

app.intent('AMAZON.HelpIntent', function(request, response) {
    response.say('Say repeat to hear the question again, or stop to end.');
    response.shouldEndSession(false);
});

app.intent('AMAZON.StopIntent', function(request, response) {
    var correct = parseInt(request.session('correct') || '0');
    var say = ['Thanks for playing candidate quiz. '];
    if (correct) {
        say.push('You got '+correct+' correct. ');
    }
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
        console.log('answer session=', request.sessionDetails);
        var used = request.session('used') || '';
        var currentQuestionId = request.session('q');
        var say = [];
        var q = currentQuestionId ? quiz.getQuestion(currentQuestionId) : null;
        console.log('answerIntent current=|'+currentQuestionId+'| used=|'+used+'|');
        var correct = parseInt(request.session('correct') || '0');
        // found question in session; check answer
        if (q) {
            var answer = request.slot('ANSWER');
            var sayAnswer = q.answer(answer);
            if (q.isCorrect(answer)) {
                say.push('<s>'+sayAnswer+' is correct!</s>');
                correct += 1;
            } else {
                say.push('<s>The correct answer is '+q.answerText()+'.</s>');
            }
            say.push(q.explanation());
            used += ','+currentQuestionId;
        }
        response.session('correct', correct+'');
        // save list of used questions
        used = used.trim();
        console.log('answerIntent setting used to |'+used+'|');
        response.session('used', used);
        // get next question
        var next = quiz.getNextQuestion(used);
        if (next) {
            say.push('<s>Next question.</s>');
            say.push(next.questionAndAnswers());
            response.session('q', next.id);
            response.shouldEndSession(false, 'What do you think? Is it '+next.choices()+'?');
        } else {
            say.push("That's all the questions I have for now. You got "+correct+
                " correct. Remember to vote on November eighth.");
        }
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
