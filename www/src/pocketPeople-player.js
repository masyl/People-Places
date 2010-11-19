
(function($, PP){

	var Utils = PP.Utils;



	PP.Player = new JS.Class({
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
		initialize: function(options) {
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
			if (this.isReady()) this.start()
		},
		start: function() {
			// Init the canvas
			var defaultLocation,
				sourceCode,
				self = this;
			this.timeline = new PP.Timeline(this.world);
			this.initController();
			this.loadFromLocalStorage(this.world.defaultState);
			if (this.timeline.current.location) {
				this.controller.run("goToLocation", {
					path: this.timeline.current.location.path
				});
			} else {
				alert("Oups, no location to start from!");
			}
		},
		load: function(data) {
			this.timeline.load(data);
		},
		loadFromLocalStorage: function(defaultState) {
			var storedState,
				state;
			storedState = this.storage.get("pocketPeople.state");
			state = $.extend({}, defaultState, storedState);
			console.log("state: ", state);
			this.load(state);
		},
		save: function() {
			this.storage.set("pocketPeople.state", this.timeline.save());
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
		}

	});

	PP.View = new JS.Class({
		player: null,
		ui: null,
		paper: null,
		root: null,
		set: null,
		initialize: function (rootId, player) {
			this.player = player;
			this.paper = Raphael(rootId, player.width, player.height);
			this.set = this.paper.set();
			this.root = $("#" + rootId);
			this.buildUI();
			return this;
		},
		buildUI: function() {
			/* to be overriden */
		},
		show: function () {
			this.root.fadeIn(250);
		},
		hide: function () {
			this.root.fadeOut(350);
		}
	});
	PP.OptionsView = new JS.Class(PP.View, {
		buildUI: function () {
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
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					player.storage.set("pocketPeople.state", {});
					window.location = window.location;
					view.hide();
				});

			this.set.btnBack = paper
				.text(480, 200, "Back")
				.attr({
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					view.hide();
					player.views.pause.show();
				});

		}
	});
	PP.WelcomeView = new JS.Class(PP.View, {
		buildUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			paper.rect(0, 0, 960, 540, 0).attr({
				opacity: 0.8,
				fill: "#000"
			});

			this.set.title = paper
				.text(640, 110, "People & Places")
				.attr({
					"fill": "#fff",
					"font-size": "24px",
					"text-anchor": "middle"
				});
			this.set.subTitle = paper
				.text(640, 140, '"The Demo Episode"')
				.attr({
					"fill": "#fff",
					"font-size": "36px",
					"text-anchor": "middle"
				});

			this.set.btnStartPlaying = paper
				.text(640, 200, "Start playing")
				.attr({
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					view.hide();
				});

			this.set.btnOptions = paper
				.text(640, 250, "Options")
				.attr({
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					view.hide();
					player.views.options.show();
				});

			this.set.logo = paper
				.image("images/logo-medium.png", 200, 80, 301, 352)
				.attr({
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.animate({"scale": 1.05}, 300, ">");
				})
				.mouseout(function(){
					this.animate({"scale": 1}, 300, ">");
				})

		}
	});
	PP.BoardView = new JS.Class(PP.View, {
		buildUI: function () {
			this.initBackground();
			//this.initStatusBar(boardObj, location);
			//this.initHighlight();
			//this.initActionArrow(); // must be after "showMarks"
 		},
		setLocation: function (location) {
			this.location = location;
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
			console.log(set.pause);

			var btnMute,
				imgVolumeHigh = "images/volume-high.png",
				imgVolumeMuted = "images/volume-muted.png";

			btnMute = this.set.mute = paper.image(imgVolumeHigh, 833, 483, 50, 50)
				.attr({
					cursor: "pointer"
				});
			btnMute.click(function() {
				if (player.muted) {
					soundManager.unmute();
					player.muted = false;
					btnMute.attr({ src: imgVolumeHigh });
				} else {
					soundManager.mute();
					player.muted = true;
					btnMute.attr({ src: imgVolumeMuted });
				}
			});

			// Add an empty mouseover for iOS
			set.background.mouseover(function () {
			});

			set.background.click(function () {
				set.statusBar.show();
				set.highlight.show();
			});

		},
		initStatusBar: function (board, location) {
			var self = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board,
				description;
			var StatusBar = new JS.Class({
				ui: null,
				initialize: function () {
					this.ui = {
						set: p.set()
					};
					var set = this.ui.set,
						background,
						icon,
						title,
						subTitle;

					background = p
						.image("images/statusBar-Background.png", 0, 0, 960, 111, 0);
					icon = p
						.image(self.urlMapper.image(board.icon, location.setId), 8, 8, 44, 44);
					title = p
						.text(60, 22, location.title())
						.attr({
							"fill": "#fff",
							"font-size": "20px",
							"text-anchor": "start"
						});
					description = p
						.text(60, 42, board.description)
						.attr({
							"fill": "#bbb",
							"font-size": "14px",
							"text-anchor": "start"
						});

					set.push(background);
					set.push(icon);
					set.push(title);
					set.push(description);

					set.hide().toFront();

					return this;
				},
				show: function () {
					if (!this.visible) {
						this.ui.set
							.attr({
								opacity: 0
							})
							.show()
							.animate({
								opacity: 1
							}, 300);
						this.visible = true;
					}
					return this;
				},
				hide: function () {
					this.ui.set.hide();
					this.visible = false;
					return this;
				},
				destroy: function () {
					this.ui.set.remove();
				}
			});
			if (ui.statusBar) {
				ui.statusBar.destroy();
				ui.statusBar = null;
			}
			self.ui.statusBar = new StatusBar({});
		},
		initHighlight: function (board, location) {
			var player = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board;
			var Highlight = new JS.Class({
				ui: null,
				initialize: function () {
					this.ui = {
						set: p.set()
					};
					var self = this,
						set = this.ui.set,
						background;
					background = p
						.image("images/highlight.png", 0, 0, 960, 540, 0)
						.hide();
					background.click(function () {
						self.hide();
						player.ui.statusBar.hide();
					});
					set.hide();
					background.insertAfter(player.ui.background);
					set.push(background);
					return this;
				},
				show: function () {
					if (!this.visible) {
						this.ui.set
							.attr({
								opacity: 0
							})
							.show()
							.animate({
								opacity: 1
							}, 300);
						this.visible = true;
					}
					return this;
				},
				hide: function () {
					this.ui.set.hide();
					this.visible = false;
					return this;
				},
				destroy: function () {
					this.ui.set.remove();
				}
			});
			if (ui.highlight) {
				ui.highlight.destroy();
				ui.highlight = null;
			}
			player.ui.highlight = new Highlight({});
		},
		/**
		 * placeActionArrow
		 * @param sourceMark The mark where the player is positionned
		 * @param targetMark The mark on which the action is focused
		 *
		 * Calling this method with no params, will hide the arrow
		 */
		initActionArrow: function () {
			var self = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board;
			var ActionArrow = new JS.Class({
				ui: null,
				shadowOffset: 5,
				initialize: function () {
					this.ui = {
						set: p.set()
					};
					var set = this.ui.set,
						path = "M0 0L0 0",
						arrow,
						shadow,
						tip;
					arrow = this.ui.arrow = p.path(path).hide();
					shadow = this.ui.shadow = p.path(path).hide();
					tip = this.ui.tip = p.image("images/icon-selected.png", 0, 0, 100, 100).hide();
					set.push(arrow);
					set.push(shadow);
					set.push(tip);

					// storing original coordinates
					arrow.insertBefore(ui.marks);
					shadow.insertBefore(arrow);
					tip.insertAfter(arrow);

					arrow.attr({
						stroke: "#fff",
						"stroke-linecap": "round",
						"stroke-width": 10
					});
					shadow.attr({
						stroke: "#000",
						"opacity": 0.4,
						"stroke-linecap": "round",
						"stroke-width": 12
					});
					return this;
				},
				show: function () {
					this.ui.set.show();
					return this;
				},
				hide: function () {
					this.ui.set.hide();
					return this;
				},
				place: function (sourceMark, targetMark,  iconOffsetX, iconOffsetY, sourceOffsetX, sourceOffsetY) {
					var x = 0,
						y = 0,
						x2 = 0,
						y2 = 0,
						path,
						pathShadow;
					if (sourceMark && targetMark) {
						x = targetMark.x * 960 + (iconOffsetX);
						y = targetMark.y * 540 + (iconOffsetY);
						x2 = sourceMark.x * 960 + (sourceOffsetX * sourceMark.z);
						y2 = sourceMark.y * 540 + (sourceOffsetY * sourceMark.z);
						path = "M" + x + " " + y + "L" + x2 + " " + y2;
						pathShadow = "M" + x + " " + (y+this.shadowOffset) + "L" + x2 + " " + (y2+this.shadowOffset);
						this.ui.arrow.attr({ path: path });
						this.ui.shadow.attr({ path: pathShadow });
						this.ui.tip.attr({
							x: x - 50,
							y: y - 50
						});
					}
					return this;
				},
				destroy: function () {
					this.ui.set.remove();
				}
			});
			if (ui.actionArrow) {
				ui.actionArrow.destroy();
				ui.actionArrow = null;
			}
			self.ui.actionArrow = new ActionArrow({});
		},
		showBackground: function () {
			var board = this.location.board,
				path = this.player.urlMapper.image(board.backgroundImage, this.location.setId);
			this.set.background.attr({
				src: path
			});
		},
		showMarks: function () {
			var location = this.location,
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
					self.hoveredMark = mark;
					this.attr({
						src: iconURL
					});
					set.statusBar.show();
					set.actionArrow.place(player.characterMark, mark, iconOffsetX, iconOffsetY, 0, -200).show();
				});
				imgMark.mouseout(function(e){
					this.attr({
						src: iconURLSmall
					});
					self.hoveredMark = null;
					set.actionArrow.hide();
					if (!set.highlight.visible) {
						set.statusBar.hide();
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
		buildUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper,
				btnOptions,
				btnStartOver,
				btnResume;
			paper.rect(0, 0, 960, 540, 0).attr({
				opacity: 0.8,
				fill: "#000"
			});

			this.set.title = paper
				.text(480, 80, "PocketPeople")
				.attr({
					"fill": "#fff",
					"font-size": "40px",
					"text-anchor": "middle"
				});
			btnOptions = this.set.btnOptions = paper
				.text(480, 150, "Options")
				.attr({
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					view.hide();
					player.views.options.show();
				});
			btnResume = this.set.title = paper
				.text(480, 200, "Resume")
				.attr({
					"fill": "#bbb",
					"font-size": "30px",
					"text-anchor": "middle",
					"cursor": "pointer"
				})
				.mouseover(function(){
					this.attr("fill", "#ffff66");
				})
				.mouseout(function(){
					this.attr("fill", "#bbb");
				})
				.click(function(){
					view.hide();
				});
		}
	});

})(jQuery, PocketPeople);