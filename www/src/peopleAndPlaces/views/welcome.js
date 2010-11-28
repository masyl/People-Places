
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

	Views.Welcome = new JS.Class(Views.Base, {
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			this.set.background = paper
					.image("images/welcome.jpg", 0, 0, 960, 540, 0);
			var title = "People & Places"
			this.set.titleShadow = paper
				.text(640, 113, title)
				.attr({
					"fill": "#000",
					"font-size": "24px",
					"text-anchor": "middle"
				});
			this.set.title = paper
				.text(640, 110, title)
				.attr({
					"fill": "#fff",
					"font-size": "24px",
					"text-anchor": "middle"
				});
			var subTitle = '"The Demo Episode"'
			this.set.subTitleShadow = paper
				.text(640, 144, subTitle)
				.attr({
					"fill": "#000",
					"font-size": "36px",
					"text-anchor": "middle"
				});
			this.set.subTitle = paper
				.text(640, 140, subTitle)
				.attr({
					"fill": "#fff",
					"font-size": "36px",
					"text-anchor": "middle"
				});

			this.set.menuBackground = paper
					.rect(470, 200, 340, 150, 10)
					.attr({
						"fill": "#000",
						"opacity": 0.5
					});

			this.set.btnStartPlaying = paper
				.text(640, 240, "Start playing")
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
					view.stopSoundtrack()
					player.startGame();
				});

			this.set.btnOptions = paper
				.text(640, 290, "Options")
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
					player.views.options.show();
				});

			this.set.logo = paper
				.image("images/logo-medium.png", 140, 90, 301, 352)
				.attr({
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.animate({"scale": 1.05}, 150, ">");
				})
				.mouseout(function(){
					this.animate({"scale": 1}, 150, ">");
				});


			function createMuteButton() {
				var btnMute,
					imgVolumeHigh = "images/volume-high.png",
					imgVolumeMuted = "images/volume-muted.png";

				btnMute = view.set.mute = paper.image(player.volumeMuted ? imgVolumeMuted : imgVolumeHigh, 900, 483, 50, 50)
					.attr({
						cursor: "pointer"
					});
				function mute() {
					player
						.mute()
						.save();
				}
				function unmute() {
					player
						.unmute()
						.save();
				}
				btnMute.click(function() {
					if (player.volumeMuted) {
						unmute();
					} else {
						mute();
					}
				});
				player.subscribe("mute", function(){
					btnMute.attr({ src: imgVolumeMuted });
				});
				player.subscribe("unmute", function(){
					btnMute.attr({ src: imgVolumeHigh });
				});
			};
			createMuteButton();


			return this;
		},
		startSoundtrack: function () {
			soundManager.destroySound("welcomeViewSoundtrack");
			this.soundtrack = soundManager.createSound({
				id: 'welcomeViewSoundtrack',
				url: '/sounds/Toshinori-Murashima-apple.mp3',
				autoLoad: true,
				autoPlay: true,
				multiShot: false,
				loops: 999,
				volume: 50
			});
			return this;
		},
		stopSoundtrack: function () {
			this.soundtrack.stop();
			return this;
		}
	});

})(jQuery, PocketPeople);


