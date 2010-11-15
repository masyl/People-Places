/*

TODO: NEXT PRIORITIES:
v0.1.1
	- Game Player UI
		- Show Current Character with its icon
		- Start New game with Character Selection
		- Exit/Quit
		- button to mute all soundes
	- Continue game (game list showing basic state)
		- High res icons characters
		- High res icons for boards

v0.1.2
	- Bug: When a character occupies a mark, the mark icon doesnt disapear


v0.1.3
	- Support for Aerial or Satelite boards
	- Boards for the world and major regions

v0.1.4
	- Support for "First Person" boards with sample (sink counter in bathroom, with soap)

v0.1.5

v0.2.0
	- Game Events Scripting Engine
	- Objects and Inventory
	- Popup for gratifications (objects, etc)

v0.3.0
	- Time management and movement cost calculation

v0.4.0
	- Transaction log
	- Transaction Scheduler
	- Navigation history (with player UI)

v0.5.0
	- NPCs and Dialogs
		- Darken/HIghligh when clicking on the board background or when having dialogs
			(this also shows more UI.. character, mark titles, board title, stats, time...)
	- Game UI: Show the marks title when hovering
	- Game UI: Arrow icons to point thoward more directions and a way to specifiy which orientation to display

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

	/**
	 * The Player is responsible for running games classes/logic
	 * and ui in a specific context. And loading resources accoridng to
	 * the nature of the player. Different players might load
	 * the same game logic in a different way (local/ajax/etc)
	 */

	PP.Controller = new JS.Class({
		world: null,
		timeline: null,
		commands: null,
		observer: null,
		initialize: function (_world, _timeline) {
			var controller,
				world,
				timeline,
				commands,
				observer;

			this.controller = controller = this;
			this.world = world = _world;
			this.timeline = timeline = _timeline;
			this.commands = commands = {};
			this.observer = observer = new PocketPeople.Observer();

			commands.goToLocation = function(args) {
				var location;
				location = new PP.Location(args.path, world);
				timeline.current.location = location;
				return {
					location: location
				}
			};
			//console.log("New controller created", this.world, this.timeline);
		},
		run: function (commandId, args) {
			var command,
				value;
			command = this.commands[commandId];
			if (command) {
				value = command(args) || {};
				this.controller.observer.publish("goToLocation", [value]);
				this.controller.observer.publish("run", [commandId, args]);
			}
			return this;
		}
	});

	/**
	 * The Timeline is the current state of the game and
	 * the log of transaction that have created this state
	 */
	PP.Timeline = new JS.Class({
		current: null, // The latest game state
		history: null, // The transaction history
		world: null,
		initialize: function (world) {
			this.world = world,
			this.current = {
				time: new Date(),
				character: "",
				location: null
			};
			return this;
		},
		load: function (data) {
			console.info("Loading: ", data);
			this.current.location = new PP.Location(data.locationPath, this.world);
			this.current.character = this.world.characters.get(data.character);
			return this;
		},
		save: function () {
			var data;
			data = {
				locationPath: this.current.location.path,
				character: this.current.character.id
			};
			console.info("Saving: ", data);
			return data;
		}
	});

	PP.Player = new JS.Class({
		settings: {},
		defaultStateData: null,
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
		initialize: function(options) {
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
				this.ui.paper = Raphael("stage", 960, 540);
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
			var ui = this.ui,
				p = ui.paper,
				b = ui.board,
				board,
				imgBackground,
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
			if (ui.background) ui.background.remove();
			bgSet = p.set();
			imgBackground = p
				.image(this.urlMapper.image(boardObj.backgroundImage, location.setId), 0, 0, 960, 540)
				.toFront();

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
			bgSet.push(title);
			bgSet.push(titleBar);
			this.showMarks(location);
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
				var iconURL, imgMark;
				if (mark.type === "destination") {
					iconURL = "images/icon-arrow.png";
					imgMark = p.image(iconURL, 960*mark.x-20, 540*mark.y-20, 40, 40);
				} else if (mark.type === "character") {
					iconURL = "images/icon-character.png";
					imgMark = p.image(iconURL, 960*mark.x-20, 540*mark.y-40, 40, 40);
				} else {
					iconURL = "images/icon-questionMark.png";
					imgMark = p.image(iconURL, 960*mark.x-20, 540*mark.y-20, 40, 40);
				}
				imgMark.attr({
					"cursor": "pointer",
					"opacity": 0.5
				});
				imgMark.mouseover(function(e){
					this.animate({
						"opacity" : 1
					}, 200);
				});
				imgMark.click(function(e){
					var path = location.setId + "/" + mark.destination;
					self.controller.run("goToLocation", {path: path});
				});
				imgMark.mouseout(function(e){
					this.animate({
						"opacity" : 0.5
					}, 400);
				});
				marks.push(imgMark);
			});
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
			//console.log(location, mark);
			var height = 400 * mark.z;
			var width = 200 * mark.z;
			var x = 960 * mark.x - (width / 2);
			var y = 540 * mark.y - height;
			imgPose = p
				.image(imgPoseURL, x, y, width, height);
			characterSet.push(imgPose);
		}
	});

})(jQuery, PocketPeople);