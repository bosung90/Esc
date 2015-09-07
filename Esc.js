ScoreBoard = new Mongo.Collection("scores");
Max = new Mongo.Collection('max');
Min = new Mongo.Collection('min');
GameStatus = new Mongo.Collection('gameStatus');
GameCountDown = new Mongo.Collection('gameCountDown');
Status = new Mongo.Collection('statuss');

if (Meteor.isClient) {
    var previous;

    Template.body.helpers({
        ranks: function () {
            var scoreboardCursor = ScoreBoard.find({}, {
                sort: { rank: -1, isRanked: -1 }
            });
            return scoreboardCursor;
        },
        announcementText: function () {
            if (GameStatus.findOne() == null) {
                document.getElementById('announcement').innerHTML = 'GO! Guess a number';
            }
            else {
                document.getElementById('announcement').innerHTML = GameStatus.findOne().announcementText;
            }
        },
        countdown: function () {
            if (GameCountDown.findOne() != null) {
                var timeRemain = GameCountDown.findOne().time;
                console.log(timeRemain);
                return timeRemain;
            }
            else {
                return 30;
            }
        },
        winners: function () {

            if (null != Status.findOne({ status: 'done' })) {
                console.log("done!");
                $('div.shuttle').show().animate({
                    top: '-120%',
                    right: '120%'
                }, 5000);
                $('div.container-earth').animate({
                    //...
                });
                $('img.meteor').show().delay(2000).animate({
                    height: '500px',
                    width: '500px',
                    right: "54%",
                    top: "-28%"
                }, 5000);
                $('img.exp').delay(6000).show().css({ 'opacity': 0 }).animate({
                    opacity: '1'
                }, 1000);
            } else {
                console.log("restarted jquery");
                console.log($('.exp'));
                setTimeout(function () {
                    console.log($('.exp'));
                    $('.exp').hide();
                    $('.meteor').css({
                        right: "-10%",
                        top: "-100%"
                    }).hide();
                    $('div.shuttle').css({
                        right: "-30%",
                        top: "0%"
                    }).hide();
                }, 100)


            }
            return ScoreBoard.find({ isRanked: true });
        },
        losers: function () {
            return ScoreBoard.find({ isRanked: false });
        }
    });

    Template.number_range.helpers({
        high_num: function () {
            var firstMax = Max.findOne();
            if (firstMax == null) {
                return 1000;
            }
            else {
                return Max.findOne().max;
            }
        },
        is_down_arrow: function () {
            var lastInputNum = Max.findOne();
            if (lastInputNum == null) {
                return true;
            }
            else {
                return Max.findOne().isDown;
            }
        }
    });

    Template.body.events({
        "submit .new-chat": function (event) {
            var createdAt = new Date().getTime();
            // Prevent default browser form submit
            event.preventDefault();
            // Get value from form element
            var text = event.target.text.value;
            var username = event.target.username.value;
            document.getElementById('nameID').disabled = true;
            // Insert a task into the collection
            if (previous == null || (createdAt - previous >= 0)) {
                var announcementText;
                Meteor.call('guessNumber', text, username, function (error, result) {
                    if (error) {
                        // handle error
                    } else {
                        announcementText = result;
                    };
                    console.log(announcementText);
                    document.getElementById('announcement').innerHTML = announcementText;

                    previous = createdAt;
                    // Clear form
                    event.target.text.value = "";
                });
            }
        }
    });
}

if (Meteor.isServer) {
    var answer;
    var timeRemaining;
    // Keep track of number of players who got the right answer
    var finishedUserNum;
    var users;
    var lastInsertedNum;
    var startTimer;
    var isStartTimeTicking = false;
    var isGameOver = false;

    var answerTimerTicker = function () {
        if (answer != null) {
            answer--;
        }

        if (timeRemaining != null && timeRemaining > 0) {
            timeRemaining--;
            GameCountDown.remove({});
            GameCountDown.insert({ time: timeRemaining });
        }
        else if (timeRemaining != null && timeRemaining <= 0 && !isGameOver) {
            isGameOver = true;
            gameOver();
        }
        Meteor.setTimeout(answerTimerTicker, 1000);
    }

    var resetGame = function () {
        finishedUserNum = 0;
        users = {};
        Max.remove({});
        Min.remove({});
        ScoreBoard.remove({});
        answer = Math.floor((Math.random() * 999) + 31);
        console.log(answer);
        GameStatus.remove({});
        GameStatus.insert({ announcementText: 'GO! Guess a number' });
        isGameOver = false;
        timeRemaining = 31;
        if (!isStartTimeTicking) {
            isStartTimeTicking = true;
            answerTimerTicker();
        }
        Status.remove({});
    }

    var isEveryoneFinished = function () {
        var isDone = false;

        // Check if totalUserNum is not zero and equal to finishedUserNum
        var totalUserNum = Object.keys(users).length;
        console.log('totalUserNum: ' + totalUserNum);
        if (totalUserNum != 0 && totalUserNum == finishedUserNum) {
            isDone = true;
        }

        return isDone;
    }

    var sortUserByRank = function (map) {
        var tupleArray = [];
        for (var key in map) tupleArray.push([key, map[key]]);
        tupleArray.sort(function (a, b) { return a[1] - b[1] });
        return tupleArray;
    }

    Meteor.startup(function () {
        resetGame();
    });

    var gameOver = function () {
        GameStatus.remove({});
        GameStatus.insert({ announcementText: 'Everyone is Done!     Ranking is shown below' });
        Status.insert({ status: 'done' });
        console.log('gameOver');
        startTimer = 15000;
        countStartTimer();

    }

    var countStartTimer = function () {
        console.log(startTimer);
        if (startTimer <= 0) {
            console.log('resetting game');

            resetGame();
        }
        else if (startTimer <= 10000) {
            GameStatus.remove({});
            GameStatus.insert({ announcementText: 'Game will start in ' + startTimer / 1000 + '...' });
            startTimer -= 1000;
            Meteor.setTimeout(countStartTimer, 1000);
        }
        else {
            GameStatus.remove({});
            startTimer -= 1000;
            Meteor.setTimeout(countStartTimer, 1000);
        }
    }

    Meteor.methods({
        guessNumber: function (chat, username) {
            if (isGameOver) {
                return 'Game is over, please wait';
            }

            // Check if users has username
            if (users[username] == null) {
                // username is not in users
                var newUserId = ScoreBoard.insert({ score: '', isRanked: false, name: username });
                users[username] = {};
                users[username].userId = newUserId;
            }
            else if (users[username].rank != null) {
                return 'You guessed correct already. Please wait';
            }

            // Check if chat is a number
            if (isNaN(chat)) {
                // It is not a number
                return 'You must enter a number';
            }
            else {
                // It is a number
                var chatInt = parseInt(chat);

                if (chatInt == answer) {
                    // user guessed the correct number
                    finishedUserNum++;
                    users[username].rank = finishedUserNum;
                    ScoreBoard.update(users[username].userId, {
                        $set: { score: users[username].rank, isRanked: true, name: username }
                    });
                    if (isEveryoneFinished()) {
                        console.log('everyone is finished');
                        isGameOver = true;
                        gameOver();
                    }
                    return 'You got the correct answer!(' + chatInt + ')';
                }
                else if (chatInt > answer) {
                    // guess was too high
                    lastInsertedNum = chatInt;
                    Max.remove({});
                    Max.insert({ max: chatInt, isDown: true });
                    return '(' + chatInt + ')&darr;';
                }
                else {
                    // guess was too low
                    lastInsertedNum = chatInt;
                    Max.remove({});
                    Max.insert({ max: chatInt, isDown: false });
                    return '(' + chatInt + ')&uarr;';
                }
            }
        },

        isLastNumHigh: function () {
            // check to see if last entered number is higher than the answer
            if (lastInsertedNum != null) {
                if (lastInsertedNum > answer) {
                    return true;
                }
            }
            return false;
        }
    });
}
