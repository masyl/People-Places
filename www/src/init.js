

(function($){
	var player = this.player = new PocketPeople.Player({
		world: "demo"
	});

	$("body").one("click", function(){
		player.start({
			locationPath: "stadium/forest#",
			character: "bob"
		});
	});

})(jQuery);
