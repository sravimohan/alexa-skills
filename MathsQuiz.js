'use strict';

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'SSML',
            ssml: `<speak>${output}</speak>`,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'SSML',
                ssml: `<speak>${repromptText}</speak>`,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

const maxQuestions = 10;

const speechConsCorrect = [ "Booya", "All righty", "Bam", "Bazinga", "Bingo", "Boom", "Bravo", "Cha Ching", "Cheers", "Dynomite", "Hip hip hooray", "Hurrah", 
    "Hurray", "Huzzah", "Oh dear.  Just kidding.  Hurray", "Kaboom", "Kaching", "Phew", "Righto", "Way to go", "Well done", "Whee", "Woo hoo", "Yay", "Wowza", "Yowsa"]; 

const speechConsWrong = ["Argh", "Aw man", "Blarg", "Blast", "Boo", "Bummer", "Darn", "D'oh", "Dun dun dun", "Eek", "Honk", "Le sigh", "Mamma mia", 
    "Oh boy", "Oh dear", "Oof", "Ouch", "Ruh roh", "Shucks", "Uh oh", "Wah wah", "Whoops a daisy", "Yikes"]; 

function getWelcomeResponse(callback) {
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = 'Welcome to the Alexa Maths Quiz';
    const repromptText = 'Please tell me your answer';
    const shouldEndSession = false;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for trying the Alexa Maths Quiz. Have a nice day!';
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function createQuestionAttributes(question, answer, correct, total) {
    return {
        total: total, 
        correct: correct,
        question : question,
        answer : answer,
    };
}

function repeatQuestionInSession(prompt, session, callback) {
    const cardTitle = "Question";
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    sessionAttributes = session.attributes;
    speechOutput = `${prompt}. What is ${sessionAttributes.question}?`;
    repromptText = speechOutput;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function setQuestionInSession(prompt, session, callback) {
    const cardTitle = "Question";
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    const number1 = getNumber(1,9);
    const number2 = getNumber(1,9);

    const question = `${number1}+${number2}`;
    const answer = number1 + number2;
    var total = session.attributes && session.attributes.total ? session.attributes.total + 1 : 1;
    var correct = session.attributes && session.attributes.correct ? session.attributes.correct : 0;

    sessionAttributes = createQuestionAttributes(question, answer, correct, total);
    speechOutput = `${prompt}. What is ${question}?`;
    repromptText = speechOutput;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function endQuiz(session, callback) {
    const cardTitle = "Thank you";
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = true;
    let speechOutput = '';

    var correct = session.attributes && session.attributes.correct ? session.attributes.correct : 0;
    var total = session.attributes && session.attributes.total ? session.attributes.total : 0;

    speechOutput = `${getEncouragementForCorrectAnswer()}. You got ${correct} out of ${total} questions right. Thank you for playing.`;
    repromptText = speechOutput;

    callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function checkAnswerFromSession(intent, session, callback) {
    const givenAnswer = intent.slots.Answer.value;
    const correctAnswer = session.attributes.answer;
    var total = session.attributes && session.attributes.total ? session.attributes.total : 0;
    
    if (givenAnswer && correctAnswer &&  givenAnswer == correctAnswer) {
        if(total === maxQuestions) {
            endQuiz(session, callback);
        } else {

            if(session.attributes && session.attributes.correct) {
                session.attributes.correct++;
            } else {
                session.attributes.correct = 1;
            }

           const prompt = `${getEncouragementForCorrectAnswer()}. You got ${session.attributes.correct} right.`;
           setQuestionInSession(prompt, session, callback);     
        }
    } else {
        const prompt = `${getEncouragementForWrongAnswer()}. It is ${correctAnswer}`;
        setQuestionInSession(prompt, session, callback);
    }
}

function getNumber(min, max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

function getEncouragementForCorrectAnswer() {
    return `<say-as interpret-as="interjection">${speechConsCorrect[getNumber(0,speechConsCorrect.length-1)]}.</say-as>`;
}

function getEncouragementForWrongAnswer() {
    return `<say-as interpret-as="interjection">${speechConsWrong[getNumber(0,speechConsWrong.length-1)]}.</say-as>`;
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    // getWelcomeResponse(callback);

    const prompt = "Welcome to Maths Quiz.";
    session.attributes = createQuestionAttributes(null, 0, 0, 0);
    setQuestionInSession(prompt, session, callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'StartMathsQuizIntent') {
        setQuestionInSession("Welcome to Maths Quiz.", session, callback);
    } else if (intentName === 'MyAnswerIsIntent') {
        checkAnswerFromSession(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        if (event.session.application.applicationId !== '<your skill id>') {
             callback('Invalid Application ID');
        }

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
