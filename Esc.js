//Chats = new Mongo.Collection("chats");
Max = new Mongo.Collection('max');
Min = new Mongo.Collection('min');

if (Meteor.isClient) {
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
        finishedUserNum = 0;
        users = {};
        Max.remove({});
        Min.remove({});
        // code to run on server at startup
        //Chats.remove({});
        //Chats.insert({
        //	guessed_number: "Guess a number between 1 and 100!"
        //})
    });

    Meteor.methods({
        addChat: function (chat, username) {
            // Check if users has username
            if (users[username] == null) {
                // username is not in users
                users[username] = 0;
            }

            // Check if chat is a number
            if (isNaN(chat)) {
                // It is not a number
                var new_chat = Chats.insert({ guessed_number: chat + ' is not a number' });
                return new_chat;
            }
            else {
                // It is a number
                var chatInt = parseInt(chat);
                var feedback;
                if (chatInt == answer) {
                    // user guessed the correct number
                    feedback = Chats.insert({ guessed_number: username + ' got the correct answer!' });
                    finishedUserNum++;
                    users[username] = finishedUserNum;
                    if (isEveryoneFinished()) {
                        var sortedUser = sortUserByRank(users);
                        for (i = 0; i < sortedUser.length; i++) {
                            Chats.insert({ guessed_number: sortedUser[i][1] + ". " + sortedUser[i][0] });
                        }
                        users = {};
                        finishedUserNum = 0;
                        Max.remove({});
                        Min.remove({});
                    }
                    return feedback;
                }
                else if (chatInt > answer) {
                    var currMax = Max.findOne();
                    if (currMax != null) {
                        if (chatInt > currMax.max) {
                            return null;
                        }
                    }

                    // guess was too high
                    Max.remove({});
                    Max.insert({ max: chatInt });
                    return feedback;
                }
                else {
                    // guess was too low
                    var currMin = Min.findOne();
                    if (currMin != null)
                    {
                        if (chatInt < currMin.min) {
                            return null;
                        }
                    }

                    Min.remove({});
                    Min.insert({ min: chatInt });
                    return feedback;
                }
            }
        }
    });
}
