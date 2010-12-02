
var dialog = {
	begin: function (dialogScript) {
		dialogScript.begin(this);
	},
	end: function () {},
	otherSetCharacter: function (character) {},
	otherSetPose: function (pose) {},
	otherSay: function (text) {},
	youSetPose: function (pose) {},
	youSay: function (text) {},
	addReply: function(text, label) {},
	prompt: function () {}
};

var dialogRemiAvantDeDiner = {
	begin: function (dialog) {
		dialog.start();
		dialog.otherSetCharacter("character:remi@stadium");
		dialog.otherSay("Hey... yé 11h45! Lunch time?");
		dialog.addReply("Ok, on va diner où?", "onVaMangerOu");
		dialog.prompt();
	},
	onVaMangerOu: function (dialog) {
		dialog.otherSay("On pourrait aller manger chez Luigi, mais il faudrait se dépêcher... sinon il restera plus de place et on va devoir se contenter du Méga-Bytes.")
		dialog.addReply("Ho, laisse faire alors... je dois attendre Billy, on va se contenter d’aller chercher du take-out au Café Pasta.", this.aTantotAlors);
		dialog.addReply("Dac... allons y tout de suite.", this.goingOutToLunchWithRemi);
		dialog.addReply("Attend je vais demander à Billy.", this.okJeTAttent());
		dialog.prompt();
	},
	okJeTAttent: function (dialog) {
		dialog.otherSay("Ok... je t'attend.");
		this.end();
	},
	aTantotAlors: function (dialog) {
		// do some macro commands here...
		this.end();
	},
	goingOutToLunchWithRemi: function (dialog) {
		// do some macro commands here...
		dialog.end();
	},
	end: function(dialog) {
		dialog.end();
	}
}

dialog.begin(dialogRemiAvantDeDiner);

