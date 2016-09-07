# Alexa quiz

This repo contains code and content for the DevProgress Alexa app. Keep up with the latest in the #proj-alexa_echo-quiz DevProgress Slack channel.

The code is JavaScript, and uses the [alexa-app](https://github.com/matt-kruse/alexa-app) framework for ease of development.  The code is hosted as a [Lambda function](https://aws.amazon.com/lambda/), and saves particupant state to a [Firebase](https://firebase.google.com/) database.

Quiz content was born on #proj-mobilequizzes, with minor edits for use in a voice UI.

You can play with the simulator at https://echosim.io/.  If you're not a developer, find credentials in a pinned message in  #proj-alexa_echo-quiz.

## Getting started

### developers

Before you start, you'll need:

- [Node.js 4.3](https://nodejs.org/en/download/)

Clone this repo, then
- cd into `alexa-quiz` and run `npm install`
- cd into `apps` and run `npm install`

You can test locally using alexa-app-server. It has a basic web UI that allows you to send requests and see the responses.  It won't help you hear how Alexa says things or test whether it can understand your speech, but it's quick and easy to set up.

- run `node server` from `alexa-quiz`
- go to http://localhost:8080/alexa/candidatequiz
- see https://github.com/matt-kruse/alexa-app-server for more details

If you're feeling ambitious, you can set up your own Alexa app skill and Lambda function.  Do this if you want to test on your own Alexa-enabled device, or want to test your own version with the Echo simulator.  To do this, you'll need to:

- create an [AWS account](https://aws.amazon.com/getting-started/)
- create an [Amazon developer account](https://developer.amazon.com/)
- install [AWS CLI](https://aws.amazon.com/cli/)
- install the [alcl](https://github.com/kielni/alcl) tool (optional; makes it easier to work with Lambda functions from the command line)

Make sure you do everything in us-east-1; that's the only region that supports the Alexa skills kit.

Set up Lambda function:
- if you don't already have one, create a [Lambda execution role](http://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-create-iam-role.html)
- run `alcl create-function -r _Lambda_execution_role_ARN` to create the Lambda function
- go to the [AWS Console](https://console.aws.amazon.com), click Lambda, candidatequiz, then Triggers tab.  Click Add trigger, then choose Alexa Skills Kit

Create Alexa skill on [AWS Developer Console](https://developer.amazon.com/edw/home.html#/skills/list)
- click Alexa in the top nav, then Alexa Skills Kit
- click Add a new skill
- fill in a name and invocation name; click Next
- cut and paste alexa-quiz/apps/candidate-quiz/aws/intent.json to the intent schema box
- add a custom slot: type = `ANSWERS`  values = `A | B | C | true | false` (one per line)
- cut and paste alexa-quiz/apps/candidate-quiz/aws/utter.txt to utterances box
- click Next
- paste in your Lambda ARN; you can find this on the top right of the Lambda page in the AWS Console
- click Save

To upload your code, run `alcl push`
To test, run `alcl test -f filename`; see sample files in `aws` (ie answer-a.json to answer A).  Current and already-seen questions are stored in the session, so you may want to edit that section before testing.

### non-developers

Question data is in [questions.json](apps/candidate-quiz/questions.json).  Each question must have a unique numeric id.  Each question should contain `question`, `answer`, and `explanation` keys.  `answer` is the correct answer to the question.  Multiple choice questions should have an `answers` section, with `A`, `B`, and `C` sections.

Sample multiple choice question:

    "1": {
        "question": "How many extra days do women have to work into a new year in order to catch up to what their male counterparts made during the previous year?",
        "answers": {
            "A": "30 days",
            "B": "60 days",
            "C": "90 days"
        },
        "answer": "B",
        "explanation": "On the whole, women have to work nearly 4 months into a new year in order to make the same amount of money that men made during the previous year."
    }

Sample true/false question:

    "2": {
        "question": "True or false: The top 25 hedge-fund managers in America make more money than all of our country's kindergarten teachers combined.",
        "answer": "true",
        "explanation": "In 2014, America’s 158 thousand kindergarten teachers made about 8.5 billion dollars collectively. By comparison, the top 25 hedge fund managers in America collectively earned 11.6 billion dollars in 2015."
    }

