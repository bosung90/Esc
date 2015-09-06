ScoreBoard = new Mongo.Collection("scores");
Max = new Mongo.Collection('max');
Min = new Mongo.Collection('min');
Users = new Mongo.Collection("userlist");

if (Meteor.isClient) {
    Template.body.helpers({
        ranks: function () {
            return ScoreBoard.find({});
        },

        userlist: function () {
            return Users.find({});
        }
    });


    Template.number_range.helpers({
        high_num: function () {
            var firstMax = Max.findOne();
            if (firstMax == null) {
                return 100;
            }
            else {
                return Max.findOne().max;
            }
        },
        lower_num: function () {
            var firstMin = Min.findOne();
            if (firstMin == null) {
                return 1;
            }
            else {
                return Min.findOne().min;
            }
        }
    });

    var previous;

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
            //Chats.insert({
            //	guessed_number: text
            //}); 
            if (previous == null || (createdAt - previous >= 3000)) {
                //console.log(username);
                Meteor.call('addChat', text, username);
                //Meteor.call('addChat', text);

                previous = createdAt;
                // Clear form
                event.target.text.value = "";
            }
        }
    });
}

if (Meteor.isServer) {
    var answer = Math.floor((Math.random() * 100) + 1);
    // Keep track of number of players who got the right answer
    var finishedUserNum = 0;
    var users = {};
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

    var gameOver = function()
    {
    	Meteor.setTimeout(resetGame, 10000);
    }

    var resetGame = function ()
    {
    	finishedUserNum = 0;
    	users = {};    	
    	Max.remove({});
    	Min.remove({});
    	ScoreBoard.remove({});
    	Users.remove({});
    }

    Meteor.methods({
        addChat: function (chat, username) {
            // Check if users has username
            if (users[username] == null) {
                // username is not in users
                Users.insert({ userID: username });
                users[username] = 0;
            }

            // Check if chat is a number
            if (isNaN(chat)) {
                // It is not a number
                return;
            }
            else {
                // It is a number
                var chatInt = parseInt(chat);
                if (chatInt == answer) {
                    // user guessed the correct number
                    finishedUserNum++;
                    users[username] = finishedUserNum;
                    if (isEveryoneFinished()) {
                        var sortedUser = sortUserByRank(users);
                        Users.remove({});
                        for (i = 0; i < sortedUser.length; i++) {
                            ScoreBoard.insert({ score: sortedUser[i][1], name: sortedUser[i][0] });
                        }
                        gameOver();
                    }
                    return;
                }
                else if (chatInt > answer) {
                    var currMax = Max.findOne();
                    if (currMax != null) {
                        if (chatInt > currMax.max) {
                            return;
                        }
                    }

                    // guess was too high
                    Max.remove({});
                    Max.insert({ max: chatInt });
                    return;
                }
                else {
                    // guess was too low
                    var currMin = Min.findOne();
                    if (currMin != null) {
                        if (chatInt < currMin.min) {
                            return;
                        }
                    }

                    Min.remove({});
                    Min.insert({ min: chatInt });
                    return;
                }
            }
        }
    });
}
