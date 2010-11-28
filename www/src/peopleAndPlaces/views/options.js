
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

	Views.Options = new JS.Class(Views.Base, {
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			paper.rect(0, 0, 960, 540, 0).attr({
				opacity: 0.8,
				fill: "#000"
			});

			this.set.title = paper
				.text(480, 80, "Options")
				.attr({
					"fill": "#fff",
					"font-size": "40px",
					"text-anchor": "middle"
				});

			this.set.btnStartOver = paper
				.text(480, 150, "Start Over")
				.attr({
					"fill": "#fff",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr({
						"fill": "#ffff66",
						"font-size": "34px"
					});
				})
				.mouseout(function(){
					this.attr({
						"fill": "#fff",
						"font-size": "30px"
					});
				})
				.click(function(){
					player.storage.set("pocketPeople.state", {});
					window.location = window.location;
				});

			this.set.btnBack = paper
				.text(480, 200, "Back")
				.attr({
					"fill": "#fff",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr({
						"fill": "#ffff66",
						"font-size": "34px"
					});
				})
				.mouseout(function(){
					this.attr({
						"fill": "#fff",
						"font-size": "30px"
					});
				})
				.click(function(){
					view.hide();
				});

			return this;
		}
	});


})(jQuery, PocketPeople);


