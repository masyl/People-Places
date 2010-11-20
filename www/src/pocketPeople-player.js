// HoveredMark
(function($, PP){

	var Utils = PP.Utils;



	PP.Player = new JS.Class(PP.Observer, {
		defaultSettings: {},
		settings: null,
		views: null,
		width: 960,
		height: 540,
		world: null,
		soundtrack: null,
		controller: null,
		timeline: null,
		storage: null,
		readyIndicators: null,
		hoveredMark: null,
		characterMark: null,
		volumeMuted: false,
		initialize: function(options) {
			this.callSuper();
			this.settings = $.extend({}, this.defaultSettings, options);
			this.readyIndicators = {
				"storage": false,
				"worldData": false,
				"soundManager": false
			};
			this.views = {
				board: new PP.BoardView("boardView", this),
				options: new PP.OptionsView("optionsView", this),
				pause: new PP.PauseView("pauseView", this),
				welcome: new PP.WelcomeView("welcomeView", this)
			};
			this.views.options.hide();
			this.views.pause.hide();
			this.views.board.show();
			this.views.welcome.show();
			this.initStorage();
			this.initSoundManager();
			this.loadWorld(this.settings.world);
			return this;
		},
		initStorage: function() {
			this.storage = {
				get: function (key) {
					return (key) ? $.jStorage.get(key) : null;
				},
				set: function (key, value) {
					return (key) ? $.jStorage.set(key, value) : null;
				}
			};
			this.nowReady("storage").startIfReady();
			return this;
		},
		initController: function () {
			this.controller = new PP.Controller(this.world, this.timeline);
			var player = this;
			function subscribe (commandId) {
				player.controller.observer.subscribe(commandId, function(result) {
					player.controllerHooks[commandId].call(player, result);
				});
			}
			subscribe("goToLocation");

			/* Generic hook for all transactions/commands */
			player.controller.observer.subscribe("run", function(commandId, args) {
				player.controllerHooks.OnRun.call(player, commandId, args);
			});
			return this;
		},
		initSoundManager: function() {
			var self = this;
			if (soundManager) {
				soundManager.url = '/libs/soundmanager/swf/';
				soundManager.flashVersion = 9;
				soundManager.useFlashBlock = false;
				soundManager.debugMode = false;
				soundManager.onready(function(){
					self.nowReady("soundManager").startIfReady();
				});
			} else {
				console.error("Sound manager not loaded!");
			}
			return this;
		},
		/**
		 * All methods under controllerHooks will be called with "player" as the context
		 */
		controllerHooks: {
			OnRun: function (commandId, args) {
				this.save();
			},
			goToLocation: function (result) {
				var location = result.location;
				this.views.board.setLocation(location);
			}
		},
		urlMapper: {
			world: function(id) {
				return "Worlds/" + id + "/manifest.json";
			},
			set: function(id) {
				return "Sets/" + id + "/manifest.json";
			},
			image: function(path, setId) {
				return "Sets/" + setId + "/" + path;
			}
		},
		nowReady: function(id) {
			this.readyIndicators[id] = true;
			return this;
		},
		isReady: function() {
			for (var key in this.readyIndicators) {
				if (!this.readyIndicators[key]) return false;
			}
			return true;
		},
		startIfReady: function (id) {
//			console.log("Start if ready", this.readyIndicators, this.isReady());
			if (this.isReady()) this.start();
			return this;
		},
		start: function() {
			// Init the canvas
			var defaultLocation,
				sourceCode,
				self = this;
			this.timeline = new PP.Timeline(this.world);
			this.initController();
			this.loadFromLocalStorage({
				game: this.world.defaultState,
				player: {}
			});
			if (this.timeline.current.location) {
				this.controller.run("goToLocation", {
					path: this.timeline.current.location.path
				});
			} else {
				alert("Oups, no location to start from!");
			}
			return this;
		},
		load: function(data) {
			var gameState = data.game,
				playerState = data.player;
			this.timeline.state(gameState);
			this.state(playerState);
			return this;
		},
		loadFromLocalStorage: function(defaultState) {
			var storedState,
				state;
			storedState = this.storage.get("pocketPeople.state");
			state = $.extend({}, defaultState, storedState);
			console.log("state: ", state, storedState);
			this.load(state);
			return this;
		},
		save: function() {
			console.log("saving");
			var state = {
				"game":  this.timeline.state(),
				"player": this.state()
			};
			this.storage.set("pocketPeople.state", state);
			return this;
		},
		state: function (newState) {
			if (newState) {
				// Set the volume
				if (this.volumeMuted != "undefined") {
					if (newState.volumeMuted) {
						this.mute();
					} else {
						this.unmute();
					}
				}
			}
			var state = {
				"volumeMuted": this.volumeMuted
			}
			return state;
		},
		loadWorld: function (id) {
			//console.log("loadWorld: ", url);
			var self = this,
				url = this.urlMapper.world(id);
			$.getJSON(url, function (data) {
				self.world = new PP.World(data);
				//console.log("World loaded: manifest: ", data);
				self.loadSets();
			});
			return this;
		},
		setsToLoad: 0,
		loadSets: function() {
			var self = this;
			//console.log("loading: ", self.world.settings.sets);
			$(self.world.settings.sets).each(function() {
				self.setsToLoad = self.setsToLoad + 1;
			});
			$(self.world.settings.sets).each(function() {
				var set,
					id = this+"", // Convert back to a simple string
					url = self.urlMapper.set(id);
				//console.log("loading: ", url);
				$.getJSON(url, function (data) {
					//console.log("Set loaded");
					set = new PP.Set(data);
					self.world.sets.store(id, set);
					//console.log("Set loaded: manifest: ", set, id);
					self.world.boards.update(set.boards);
					self.world.marks.update(set.marks);
					self.world.characters.update(set.characters);
					self.setsToLoad = self.setsToLoad - 1;
					if (self.setsToLoad <= 0) {
						self.nowReady("worldData").startIfReady();
					}
				});
			});
			return this;
		},
		mute: function () {
			soundManager.mute();
			this.volumeMuted = true;
			this.publish("mute");
			return this;
		},
		unmute: function () {
			soundManager.unmute();
			this.volumeMuted = false;
			this.publish("unmute");
			return this;
		}
	});

	PP.PaperObject = new JS.Class(PP.Observer, {
		player: null,
		paper: null,
		set: null,
		view: null,
		initialize: function (view) {
			this.callSuper();
			this.view = view;
			this.player = view.player;
			this.paper = view.paper;
			this.set = this.paper.set();
			this.initUI();
			if (!IsiPhoneOS) {
				this.initKeyboard();
			}
			return this;
		},
		initKeyboard: function () {
			/* to be overriden */
		},
		initUI: function () {
			/* to be overriden */
		},
		show: function () {
			if (!this.visible) {
				this.set
					.attr({
						opacity: 0
					})
					.show()
					.animate({
						opacity: 1
					}, 300);
				this.visible = true;
			}
			this.visible = true;
			return this;
		},
		hide: function () {
			this.set.hide();
			this.visible = false;
			return this;
		},
		destroy: function() {
			this.ui.set.remove();
		}
	});

	PP.StatusBar = new JS.Class(PP.PaperObject, {
		initUI: function () {
			var set = this.set,
				paper = this.paper;
			set.background = paper
				.image("images/statusBar-Background.png", 0, 0, 960, 111, 0);
			set.icon = paper
				.image("", 8, 8, 44, 44);
			set.title = paper
				.text(60, 22, "")
				.attr({
					"fill": "#fff",
					"font-size": "20px",
					"text-anchor": "start"
				});
			set.description = paper
				.text(60, 42, "")
				.attr({
					"fill": "#fff",
					"font-size": "14px",
					"text-anchor": "start"
				});
			// todo: Can this be done in a single call ?
			set.push(set.background);
			set.push(set.icon);
			set.push(set.title);
			set.push(set.description);
			return this;
		},
		refresh: function() {
			var set = this.set,
				paper = this.paper,
				location = this.player.timeline.location;

			if (location) {
				set.icon.attr("src", player.urlMapper.image(location.board.icon, location.setId));
				set.title.attr("text", location.title())
				set.description.attr("text", location.board.description)
			}
			return this;
		}
	});

	PP.Highlight = new JS.Class(PP.PaperObject, {
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
				set.background = paper
					.image("images/highlight.png", 0, 0, 960, 540, 0)
					.hide()
					.click(function () {
						self.hide();
						self.view.statusBar.hide();
					})
					.insertAfter(this.view.set.background);
				self.hide();
			set.push(set.background);
			return this;
		}
	});

	PP.ActionArrow = new JS.Class(PP.PaperObject, {
		ui: null,
		shadowOffset: 5,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				path = "M0 0L0 0",
				arrow,
				shadow,
				tip;
			arrow = set.arrow = paper
				.path(path)
				.hide()
				.insertAfter(this.view.highlight.set.background)
				.attr({
					stroke: "#fff",
					"stroke-linecap": "round",
					"stroke-width": 10
				});

			shadow = set.shadow = paper
				.path(path)
				.hide()
				.insertBefore(arrow)
				.attr({
					stroke: "#000",
					"opacity": 0.4,
					"stroke-linecap": "round",
					"stroke-width": 12
				});

			tip = set.tip = paper
				.image("images/icon-selected.png", 0, 0, 100, 100)
				.hide()
				.insertAfter(arrow);

			set.push(arrow);
			set.push(shadow);
			set.push(tip);
			return this;
		},
		place: function (sourceMark, targetMark,  targetOffsetX, targetOffsetY, sourceOffsetX, sourceOffsetY, onPlacedCallback) {
			var set = this.set,
				x = 0,
				y = 0,
				x2 = 0,
				y2 = 0,
				path,
				pathShadow;
			if (sourceMark && targetMark) {
				x = targetMark.x * 960 + (targetOffsetX * targetMark.z || 1);
				y = targetMark.y * 540 + (targetOffsetY * targetMark.z || 1);
				x2 = sourceMark.x * 960 + (sourceOffsetX * sourceMark.z);
				y2 = sourceMark.y * 540 + (sourceOffsetY * sourceMark.z);
				path = "M" + x + " " + y + "L" + x2 + " " + y2;
				pathShadow = "M" + x + " " + (y+this.shadowOffset) + "L" + x2 + " " + (y2+this.shadowOffset);
				set.arrow.animate({
					path: path
				}, 200);
				set.shadow.animate({
					path: pathShadow
				}, 200);
				set.tip.animate({
					x: x - 50,
					y: y - 50
				}, 200, function() {
					if (onPlacedCallback) onPlacedCallback();
				});
			}
			return this;
		}
	});

	PP.View = new JS.Class({
		player: null,
		paper: null,
		root: null,
		set: null,
		visible: false,
		initialize: function (rootId, player) {
			this.player = player;
			this.paper = Raphael(rootId, player.width, player.height);
			this.set = this.paper.set();
			this.root = $("#" + rootId);
			this.initUI();
			return this;
		},
		initUI: function() {
			/* to be overriden */
			return this;
		},
		show: function () {
			this.visible = true;
			this.root.fadeIn(250);
			return this;
		},
		hide: function () {
			this.visible = false;
			this.root.fadeOut(350);
			return this;
		}
	});
	PP.OptionsView = new JS.Class(PP.View, {
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
					view.hide();
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
					player.views.pause.show();
				});

		}
	});
	PP.WelcomeView = new JS.Class(PP.View, {
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			this.set.background = paper.image("images/welcome.jpg", 0, 0, 960, 540, 0);

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
					view.hide();
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
					view.hide();
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
				})

		}
	});
	PP.BoardView = new JS.Class(PP.View, {
		statusBar: null,
		highlight: null,
		initUI: function () {
			var self = this;
			this.initBackground();
			this.statusBar = new PP.StatusBar(this);
			this.highlight = new PP.Highlight(this);
			this.actionArrow = new PP.ActionArrow(this);
		},
		initKeyboard: function() {
			var self = this;
			$(document).keyup(function(e) {
				var views = self.player.views;
				if (!e.isPropagationStopped()) {
					if (e.which == 27) {
						if (!(
								views.pause.visible ||
								views.options.visible ||
								views.welcome.visible
							)) {
							self.player.views.pause.show();
							e.stopPropagation();
						}
					}
				}
			});
		},
		setLocation: function (location) {
			this.location = location;
			this.statusBar.hide().refresh();
			this.startSoundtrack();
			this.showBackground();
			this.showMarks();
			this.showCharacter()
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
				.image("images/pause.png", 900, 480, 52, 52)
				.attr({
					cursor: "pointer"
				})
				.click(function(){
					player.views.pause.show();
				});
			set.pause.toFront();

			var btnMute,
				imgVolumeHigh = "images/volume-high.png",
				imgVolumeMuted = "images/volume-muted.png";

			btnMute = this.set.mute = paper.image(player.volumeMuted ? imgVolumeMuted : imgVolumeHigh, 833, 483, 50, 50)
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

			// Add an empty mouseover for iOS
			set.background.mouseover(function () {
			});

			set.background.click(function () {
				player.views.board.statusBar.show();
				player.views.board.highlight.show();
			});

		},
		showBackground: function () {
			var board = this.location.board,
				path = this.player.urlMapper.image(board.backgroundImage, this.location.setId);
			this.set.background.attr({
				src: path
			});
		},
		showMarks: function () {
			var player = this.player,
				location = this.location,
				self = this,
				set = this.set,
				p = this.paper;
			if (set.marks) set.marks.remove();
			var marks = set.marks = p.set();
			//console.log(location.board, location.board.marks);
			location.board.marks.forEachValue(function(mark) {
				//console.log("Placing mark", mark);
				var iconURL, iconURLSmall, imgMark;
				var OSSizeRatio = 1,
					iconOffsetX = 0,
					iconOffsetY = 0;
				if (IsiPhone || IsiPod) OSSizeRatio = 1.5;
				if (mark.type === "destination") {
					iconURL = "images/icon-arrow.png";
					iconURLSmall = "images/icon-arrow-dot.png";
					imgMark = p.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
				} else if (mark.type === "character") {
					iconURL = "images/icon-character.png";
					iconURLSmall = "images/icon-character-small.png";
					iconOffsetY = -20;
					imgMark = p.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-40*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
				} else {
					iconURL = "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					imgMark = p.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
				}
				imgMark.attr({
					"cursor": "pointer"
				});
				imgMark.mouseover(function(e){
					var board = player.views.board;
					self.hoveredMark = mark;
					this.attr({
						src: iconURL
					});
					board.statusBar.show();
					board.actionArrow.show().place(player.characterMark, mark, iconOffsetX, iconOffsetY, 0, -200);
				});
				player.views.board.actionArrow.show().place(player.characterMark, player.characterMark, 0, -200, 0, -200);
				imgMark.mouseout(function(e){
					var board = player.views.board;
					this.attr({
						src: iconURLSmall
					});
					self.hoveredMark = null;
					board.actionArrow.place(player.characterMark, player.characterMark, 0, -200, 0, -200, function() {
						board.actionArrow.hide();
					});
					if (!board.highlight.visible) {
						board.statusBar.hide();
					}
				});
				imgMark.attr({
					"cursor": "pointer"
				});
				imgMark.click(function(e){
					var path = location.setId + "/" + mark.destination;
					self.controller.run("goToLocation", {path: path});
				});
				marks.push(imgMark);
			});
		},
		showCharacter: function () {
			var location = this.location,
				self = this,
				set = this.set,
				p = this.paper,
				imgPoseURL,
				imgPose;
			var character = player.timeline.current.character;
			if (!character) {
				console.error("character definition not found for :", this.timeline.current.character);
				return false;
			}
			var pose = character.poses.get("standing");
			imgPoseURL = player.urlMapper.image(pose.image, location.setId);
			//console.log("showCharacter ", character, imgPoseURL);
			var mark = location.mark;
			player.characterMark = mark;
			var height = 400 * mark.z;
			var width = 200 * mark.z;
			var x = 960 * mark.x - (width / 2);
			var y = 540 * mark.y - height;
			this.set.imgPose = p
				.image(imgPoseURL, x, y, width, height)
				.attr({
					"cursor": "pointer"
				});
		}
	});

	PP.PauseView = new JS.Class(PP.View, {
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
					view.hide();
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
						if (self.view.visible) {
							self.view.hide();
							e.stopPropagation();
						}
					}
				}
			});
		}
	});

})(jQuery, PocketPeople);