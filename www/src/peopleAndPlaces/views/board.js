
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

	Views.Board = new JS.Class(Views.Base, {
		statusBar: null,
		highlight: null,
		actionArrow: null,
		marks: null,
		character: null,
		artefacts: null,
		inventoryBar: null,
		initUI: function () {
			var self = this;
			this.initBackground();
			this.statusBar = new PP.StatusBar(this);
			this.highlight = new PP.Highlight(this);
			this.actionArrow = new PP.ActionArrow(this);
			this.marks = new PP.MarkSet(this);
			this.character = new PP.ActingCharacter(this);
			this.artefacts = new JS.Hash();
			this.inventoryBar = new PP.InventoryBar(this, 20, 460);
		},
		databind: function() {
			this.inventoryBar
					.databind(this.player.timeline.current.character)
					.refresh()
					.show();
			return this;
		},
		initKeyboard: function() {
			var self = this;
			$(document).keyup(function(e) {
				var views = self.player.views;
				if (!e.isPropagationStopped()) {
					if (e.which == 27) {
						if (self.inFocus) {
							self.player.views.pause.show();
							e.stopPropagation();
						}
					}
				}
			});
			return this;
		},
		setLocation: function (location) {
			this.location = location;
			this.databind();
			this.statusBar.hide().refresh();
			this.startSoundtrack();
			this.showBackground();
			this.marks.place();
			this.character.place();
		},
		startSoundtrack: function () {
			var board = this.location.board;
			if (board.soundtrack) {
				soundManager.destroySound("soundtrack");
				// todo: USE URL MAPPER HERE... THIS WILL CASE A BUG
				soundManager.createSound({
					id: 'soundtrack',
					url: '/Sets/stadium/' + board.soundtrack,
					autoLoad: true,
					autoPlay: true,
					multiShot: false,
					loops: 999,
					volume: 100
				});
			}
		},
		initBackground: function () {
			var paper = this.paper,
				player = this.player,
				set = this.set,
				board,
				imgBackground,
				bgSet,
				boardObj = location.board;

			// todo: set size dynamically
			set.board = set.board || paper.set();
			if (set.background) {
				set.background.remove();
			}
			//todo: use width/height from player object
			set.background = paper
				.image("", 0, 0, 960, 540)
				.toFront();

			// Create pause button if doesnt already exist
			set.pause = set.pause || paper
				.image("images/pause.png", 833, 480, 52, 52)
				.attr({
					cursor: "pointer"
				})
				.click(function(){
					player.views.pause.show();
				});
			set.pause.toFront();

			function createMuteButton() {
				var btnMute,
					imgVolumeHigh = "images/volume-high.png",
					imgVolumeMuted = "images/volume-muted.png";

				btnMute = set.mute = paper
					.image(player.volumeMuted ? imgVolumeMuted : imgVolumeHigh, 900, 483, 50, 50)
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

			// Add an empty mouseover for iOS
			set.background.mouseover(function () {
			});

			set.background.click(function () {
				var board = player.views.board
				board.marks.unHook();
			});

		},
		showBackground: function () {
			var board = this.location.board,
				path = this.player.urlMapper.image(board.backgroundImage, this.location.setId);
			this.set.background.attr({
				src: path
			});
		}
	});


})(jQuery, PocketPeople);


