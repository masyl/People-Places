/*

TODO: NEXT PRIORITIES:
v0.1.1
	+ added Meta tags for iOS devices
	+ Tweaked UI and interactions for iOS
	+ Unobstrucsive version of markers as a small color dot, and the bigger icon is used only on mouse hover.
	+ UI for highlighting markers before using them
	- Ability to move to a specific character mark
	- click on the boards background will trigger the highlight on/off
	- Only show detailed UI when in highligh mode
	- UI: Show the marks title when hovering
	- UI: Arrow icons to point thoward more directions and a way to specifiy which orientation to display
	- Bug: draw Characters under mark... otherwise not clickable... and draw arrow under character
	- Bug: old actionArrow accumulate in the canvas background...
	- Bug: When a character occupies a mark, the mark icon doesnt disapear

v0.1.2
	- Game Player UI
		- Show Current Character with its icon
		- Start New game with Character Selection
		- Exit/Quit
		- button to mute all soundes
	- Continue game (game list showing basic state)
		- High res icons characters
		- High res icons for boards


v0.1.3
	- Game Events Scripting Engine
	- Objects and Inventory
	- Popup for gratifications (objects, etc)

v0.3.0
	- Time management and movement cost calculation

v0.2.0
	- Support for Aerial or Satelite boards
	- Boards for the world and major regions
	- Support for "First Person" boards with sample (sink counter in bathroom, with soap)

v0.4.0
	- Transaction log
	- Transaction Scheduler
	- Navigation history (with player UI)

v0.5.0
	- NPCs and Dialogs
		- Darken/HIghligh when clicking on the board background or when having dialogs
			(this also shows more UI.. character, mark titles, board title, stats, time...)

v0.6.0
	- Missions/Objectives/Achievements

v0.7.0
	- ui: board: soundtrack: volume button (like on video plyers

v0.8.0
	World/Sets Editor
	Game Server (for persisting custom levels)

v0.9.0

RELEASE HISTORY:

v0.1.0
	- Game state persistence in HTML5
	- Solve the ASYNC loading problem



Todo: Scripting Scenarios/Actions:
	- Play a sound
	- Obtain/Spend an item
	- Gain knowledge of something
	- Move time forward
	- Set/Increment/Decrement game state variable
	- Change the boards background image
	- Change the boards soundtrack
	- Gain access to a new mark on a board
	-

 */

(function($, PP){

	var Utils = PP.Utils;



	PP.Player = new JS.Class({
		settings: {},
		defaultState: null,
		width: 960,
		height: 540,
		world: null,
		soundtrack: null,
		currentLocation: null, // Is a path object
		currentCharacter: "",
		ui: {
			board: null
		},
		controller: null,
		timeline: null,
		storage: null,
		readyIndicators: null,
		hoveredMark: null,
		characterMark: null,
		initialize: function(options) {
			this.defaultState = options.defaultState;
			$.extend(this.settings, options);
			this.readyIndicators = {
				"storage": false,
				"worldData": false,
				"soundManager": false
			};
			this.initStorage();
			this.initSoundManager();
			this.loadWorld(this.settings.world);
		},
		initStorage: function() {
			this.storage = {
				get: function (key) {
					return $.jStorage.get(key);
				},
				set: function (key, value) {
					return $.jStorage.set(key, value);
				}
			};
			this.nowReady("storage").startIfReady();
		},
		initController: function () {
			this.controller = new PP.Controller(this.world, this.timeline);
			var player = this;
			function subscribe (commandId, playerMethod) {
				player.controller.observer.subscribe(commandId, function(result) {
					player[playerMethod].call(player, result);
				});
			}
			subscribe("goToLocation", "controllerOnGoToLocation");

			/* Generic hook for all transactions/commands */
			player.controller.observer.subscribe("run", function(commandId, args) {
				player.controllerOnRun(commandId, args);
			});
		},
		controllerOnGoToLocation: function (result) {
			var location = result.location;
			this.showBoard(location);
			this.showCharacter(location);
		},
		controllerOnRun: function (commandId, args) {
			this.save();
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
		/**
		 * Initialize the main processing instance on a canvas object
		 * and attach the event to handle window resizing.
		 */
		start: function() {
			// Init the canvas
			var defaultLocation,
				sourceCode,
				self = this;

			//todo refactor: stage size
				this.ui.paper = Raphael("stage", player.width, player.height);
				this.resizeCanvas();

			this.timeline = new PP.Timeline(this.world);
			this.initController();
			this.loadFromLocalStorage(this.defaultState);
			// Utility function that resize the canvas to the current window size.
			// Add event handler to tesize the canvas when window is resized
			window.addEventListener("resize", function(e) {
				self.resizeCanvas();
			}, false);

			this.controller.run("goToLocation", {
				path: this.timeline.current.location.path
			});

		},
		load: function(data) {
			this.timeline.load(data);
		},
		loadFromLocalStorage: function(defaultData) {
			var data;
			data = this.storage.get("pocketPeople.state");
			this.load(data || defaultData);
		},
		save: function() {
			this.storage.set("pocketPeople.state", this.timeline.save());
		},
		resizeCanvas: function () {
			this.width = window.innerWidth;
			this.height = window.innerHeight;
			this.ui.paper.setSize(this.width, this.height);
			/* dont hardcode selector here */
			this.ui.offsetLeft = $("#stage")[0].offsetLeft;
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
		},
		showBoard: function (location) {
			var player = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board,
				board,
				imgBackground,
				imgHighlight,
				bgSet,
				title,
				titleBar,
				boardObj = location.board;

			if (boardObj.soundtrack) {
				soundManager.destroySound("soundtrack");
				soundManager.createSound({
					id: 'soundtrack',
					url: '/Sets/stadium/' + boardObj.soundtrack,
					autoLoad: true,
					autoPlay: true,
					multiShot: false,
					loops: 999,
					volume: 80
//					volume: 0
				});
			}

			// todo: set size dynamically
			ui.board = ui.board || p.set();
			if (ui.background) {
				ui.background.remove();
				ui.highlight.remove();
			}
			bgSet = p.set();
			//todo: use width/height from player object
			imgBackground = p
				.image(this.urlMapper.image(boardObj.backgroundImage, location.setId), 0, 0, 960, 540)
				.toFront();
			imgHighlight = p
				.image("./images/path-fadeOut.png", 0, 0, 960, 540)
				.hide()
				.attr({
					"opacity": 0
				});
			ui.background = imgBackground;
			ui.highlight = imgHighlight;

			// Add an empty mouseover for iOS
			imgBackground.mouseover(function(){
			});

			titleBar = p
				.rect(20, 20, 330, 40, 10)
				.attr({
					fill: "#000",
					opacity: 0.5
				});
			title = p
				.text(35, 40, location.title())
				.attr({
					"fill": "#fff",
					"font-size": "20px",
					"text-anchor": "start"
				});

			bgSet.push(imgBackground);
			bgSet.push(imgHighlight);
			bgSet.push(title);
			bgSet.push(titleBar);

			this.showMarks(location);
			this.initActionArrow(); // must be after "showMarks"
		},
		showMarks: function (location) {
			var self = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board;
			if (ui.marks) ui.marks.remove();
			var marks = ui.marks = p.set();
			//console.log(location.board, location.board.marks);
			location.board.marks.forEachValue(function(mark) {
				//console.log("Placing mark", mark);
				var iconURL, iconURLSmall, imgMark;
				var OSSizeRatio = 1,
					iconOffsetX = 0,
					iconOffsetY = 0;
				if (IsiPhoneOS) OSSizeRatio = 1.5;
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
					ui.actionArrow.place(player.characterMark, mark, iconOffsetX, iconOffsetY, 0, -200).show();
				});
				imgMark.attr({
					"cursor": "pointer"
				});
				imgMark.mouseout(function(e){
					this.attr({
						src: iconURLSmall
					});
					self.hoveredMark = null;
					ui.actionArrow.hide();
				});
				imgMark.click(function(e){
					var path = location.setId + "/" + mark.destination;
					self.controller.run("goToLocation", {path: path});
				});
				marks.push(imgMark);
			});
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
			ActionArrow = new JS.Class({
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
					/*
					ui.highlight.animate({
						opacity: 1
					}, 200).show();
					*/
					this.ui.set.show();
					return this;
				},
				hide: function () {
					/*
					ui.highlight.animate({
						opacity: 0
					}, 200).hide();
					*/
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
		showCharacter: function (location) {
			var self = this,
				ui = this.ui,
				p = ui.paper,
				b = ui.board,
				imgPoseURL,
				imgPose;
			if (ui.characterSet) ui.characterSet.remove();
			var characterSet = ui.characterSet = p.set();
			var character = this.timeline.current.character;
			if (!character) {
				console.error("character definition not found for :", this.timeline.current.character);
				return false;
			}
			var pose = character.poses.get("standing");
			imgPoseURL = this.urlMapper.image(pose.image, location.setId);
			//console.log("showCharacter ", character, imgPoseURL);
			var mark = location.mark;
			this.characterMark = mark;
			//console.log(location, mark);
			var height = 400 * mark.z;
			var width = 200 * mark.z;
			var x = 960 * mark.x - (width / 2);
			var y = 540 * mark.y - height;
			imgPose = p
				.image(imgPoseURL, x, y, width, height)
				.attr({
					"cursor": "pointer"
				});
			characterSet.push(imgPose);
		}
	});

})(jQuery, PocketPeople);