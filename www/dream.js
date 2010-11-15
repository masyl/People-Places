/**
 *	Dreams are a set of decors, characters and objects around a common theme.
 */



function PocketPeople (options) {
	var pp = this,
		settings = {};

	$.extend(settings, options);

	this.Dream = function(options) {

	};

	this.playDream = function(dream, seedWord, options) {

	};
}



var pp, defaultOptions;

defaultOptions = {

};

pp = new PocketPeople(defaultOptions);

var dream = new pp.Dream({
	id: "canyons",
	title: "Canyons",
	objects: {
		"gnome": {
			image: "gnome.png"
		}
	},
	decor: {
		"garden": {
			image: "jardin-quetaine.jpg",
			places: [
				{
					x: 0.5,
					y: 0.5,
					z: 0.5,
					width: 0.01,
					height: 0.01
				},
				{
					x: 0.3,
					y: 0.7,
					z: 0.8,
					width: 0.03,
					height: 0.03
				}
			]
		}
	}
});


pp.playDream(dream, "dream word", {

});
