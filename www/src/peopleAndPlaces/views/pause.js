
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

	Views.Pause = new JS.Class(Views.Base, {
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			this.set.background = paper.rect(0, 0, 960, 540, 0).attr({
				opacity: 0.8,
				fill: "#000"
			});

			this.set.title = paper
				.text(480, 80, "People & Places")
				.attr({
					"fill": "#fff",
					"font-size": "40px",
					"text-anchor": "middle"
				});
			this.set.btnOptions = paper
				.text(480, 150, "Options")
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
					view.hide(true);
					player.views.options.show();
				});
			this.set.btnResume = paper
				.text(480, 200, "Resume")
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
			this.set.btnQuit = paper
				.text(480, 250, "Quit")
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
					player.views.welcome.show();
				});
		},
		initKeyboard : function () {
			var self = this;
			$(document).keyup(function(e) {
				if (!e.isPropagationStopped()) {
					if (e.which == 27) {
						if (self.inFocus) {
							self.hide();
							e.stopPropagation();
						}
					}
				}
			});
			return this;
		}
	});



})(jQuery, PocketPeople);


