var questions = require('./questions.json');

var quiz = {};

function Question(id) {
    this.id = id;
    this.q = questions[id];
}

Question.prototype = {
    isBoolean: function() {
        return (this.q.answer === 'true' || this.q.answer === 'false');
    },

    question: function() {
        return '<s>'+this.q.question+'</s>';
    },

    answer: function(a) {
        return this.q.answers ? this.q.answers[a] || '' : this.q.answer;
    },

    sayLetter: function(letter) {
        return '<say-as interpret-as="characters">' + letter +'</say-as> <break strength="medium" /> ';
    },

    answers: function() {
        var say = [];
        if (this.isBoolean()) {
            return null;
        }
        var all = this.q.answers;
        var letters = Object.keys(all).sort();
        letters.forEach((a) => {
            say.push(this.sayLetter(a)+all[a]+'. <break strength="x-strong" />');
        });
        return say.join(' ');
    },

    questionAndAnswers: function() {
        var say = [this.question()];
        var answers = this.answers();
        if (answers) {
            say.push('<s>Is it?</s>');
            say.push(answers);
        }
        return say.join('\n');
    },

    choices: function() {
        if (this.isBoolean()) {
            return 'true or false';
        }
        var answers = Object.keys(this.q.answers).map((letter) => {
            return this.sayLetter(letter);
        });
        return answers.join(' or ');
    },

    isCorrect: function(answer) {
        var correct = this.q.answer;
        return this.q.answer.toUpperCase() === answer.toUpperCase();
    },

    answerText: function() {
        if (this.isBoolean()) {
            return this.q.answer;
        }
        var answer = this.q.answers[this.q.answer];
        if (!answer) {
            return '';
        }
        return this.sayLetter(this.q.answer)+', '+answer+'. ';
    },

    explanation: function() {
        return this.q.explanation;
    },

};

quiz.getNextQuestion = function(usedStr) {
    var used = [];
    if (usedStr) {
        used = usedStr.split(',');
    }
    console.log('getNextQuestion: used=', used);
    var avail = [];
    Object.keys(questions).forEach((q) => {
        if (used.indexOf(q) < 0) {
            avail.push(q);
        }
    });
    console.log('getNextQuestion: avail=', avail);
    if (!avail.length) {
        return null;
    }
    var idx = Math.floor(Math.random() * avail.length);
    console.log('getNextQuestion: key=', avail[idx]);
    return new Question(avail[idx]);
};

quiz.getQuestion = function(id) {
    return id ? new Question(id) : null;
};

module.exports = quiz;
