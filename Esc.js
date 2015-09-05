Chats = new Mongo.Collection("chats");

if (Meteor.isClient)
{
	Template.body.helpers({
		chats: function () {
			return Chats.find({});
		}
	});

	Template.body.events({
		"submit .new-chat": function (event) {
			// Prevent default browser form submit
			event.preventDefault();
			// Get value from form element
			var text = event.target.text.value;
			// Insert a task into the collection
			Chats.insert({
				guessed_number: text,
				createdAt: new Date() // current time
			});
			// Clear form
			event.target.text.value = "";
		}
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
