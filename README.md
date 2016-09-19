# Alexa quiz

<img src="https://github.com/DevProgress/alexa-quiz/blob/master/assets/quiz108.png?raw=true" alt="icon" width="108" />

> Alexa, run Quiz for America

Test your knowledge and learn about history and current issues.  Answer a few questions while getting ready for your day, or turn it into a party game with family and friends.  This quiz covers a broad range of topics, including women's rights, healthcare, education, child care, energy policy, business and jobs, unions, technology, and voting rights.

This repo contains code and content for the DevProgress Alexa quiz skill. Keep up with the latest in the #proj-alexa_echo-quiz DevProgress Slack channel.

The skill is built using the [alexa-app](https://github.com/matt-kruse/alexa-app) framework for ease of development.  The code is hosted as a [Lambda function](https://aws.amazon.com/lambda/), and saves user state to a [Firebase](https://firebase.google.com/) database.

The quiz question content was born on #proj-mobilequizzes, with minor edits for use in a voice UI.

You can play with the simulator at https://echosim.io/

Run the skill and answer a few questions: [quiz.m4a](https://github.com/DevProgress/alexa-quiz/blob/master/demo/quiz.m4a?raw=true" alt="card image)

Card sent to Alexa app after completing or stopping a quiz:

<img src="https://github.com/DevProgress/alexa-quiz/blob/master/demo/card.png?raw=true" alt="card image" width="360" />

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

The local version of the skill uses a mock database (associative array with starter data in [mock-data.json](apps/candidate-quiz/db/mock-data.json)).

The Lambda version of the skill saves data to [Firebase](https://firebase.google.com) for persistence between sessions.

Schema:

    {
        "users": {
            "userId1": {
                "q": "3",  // question id
                "all": {"1": "A", "2": "false"},  // all Q&A for this user
                "current": {"1": "A", "2": "false"} // current session Q&A
            }
        },
        "logs": {  // global stats
            "questions": {
                "1": {  // question id
                    "A": 3,  // number of A answers
                    "B": 7,
                    "C": 4
                }
            }
        }
    }

To use your own Firebase database:
- [set up a database](https://firebase.google.com/docs/server/setup)
- create apps/candidate-quiz/db/config.json like this:


    {
      "project_id": "project id",
      "private_key": "-----BEGIN PRIVATE KEY-----\n private key data \n-----END PRIVATE KEY-----\n",
      "client_email": "client email",
      "databaseURL": "https://database name.firebaseio.com"
    }

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

Questions file *must* be valid JSON. Paste it into http://jsonlint.com/ to find and fix any errors.

To test how text will sound from Alexa:
- go to https://developer.amazon.com/ and login with credentials pinned to #proj-alexa_echo-quiz
- click Alexa in top nav, then Alexa Skills Kit, then candidatequiz (skill name will change)
- click Test in left nav
- paste text into Voice Simulator box, then click Listen
