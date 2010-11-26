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
		focusStack: null,
		initialize: function(options) {
			this.callSuper();
			this.focusStack = [];
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
				notifications: new PP.NotificationsView("notificationsView", this),
				welcome: new PP.WelcomeView("welcomeView", this)
			};

			var focusStack = this.focusStack;
			bindViewsFocusEvents(this.views);

			function bindViewsFocusEvents(views) {
				for (var view in views) {
					bindViewFocusEvent(views[view], views);
				}
			}
			function bindViewFocusEvent(view, views) {
				view
					.subscribe("onShow", function() { onShowView(view, views) })
					.subscribe("onHide", function(keepFocus) { onHideView(view, views, keepFocus) });
			}
			function onShowView(view, views) {
				blurAllExcept(view, views);
				var currentFocus = focusStack.pop();
				if (currentFocus) {
					focusStack.push(currentFocus);
					if (currentFocus !== view) {
						focusStack.push(view);
					}
				} else {
					focusStack.push(view);
				}
				view.focus();
				console.log(focusStack);
			}
			function onHideView(view, views, keepFocus) {
				console.log("keepFocus", keepFocus);
				if (!keepFocus) {
					blurAllExcept(view, views);
					var currentFocus = focusStack.pop();
					// if the view that got hidden was not in focus
					if (currentFocus) {
						if (currentFocus !== view) {
							// put back the currentFocus on the stack
							focusStack.push(currentFocus);
						} else {
							// otherwise, leave it popped unless it was said to keep the focus
							// and move the next focus if there is one left in the stack
							var nextFocus = focusStack.pop();
							if (nextFocus) nextFocus.show();
						}
					} else {
						console.log("no focusStack")
					}
				}
				console.log(focusStack);
			}
			function blurAllExcept(exceptView, views) {
				var view;
				for (view in views) {
					view = views[view];
					if (view !== exceptView) {
						view.blur();
					}
				}
			}

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
					var command = player.controllerHooks[commandId]
					if (command) {
						command.call(player, result);
					} else {
						console.error("Macro command not found: ", commandId);
					}
				});
			}
			subscribe("goToLocation");
			subscribe("findArtefact");

			/* Generic hook for all transactions/commands */
			player.controller.observer.subscribe("run", function(commandId, args) {
				player.controllerHooks.OnRun.call(player, commandId, args);
			});
			player.controller.observer.subscribe("startMacro", function(macroId, args) {
				player.controllerHooks.OnStartMacro.call(player, macroId, args);
			});
			player.controller.observer.subscribe("endMacro", function(macroId, args) {
				player.controllerHooks.OnEndMacro.call(player, macroId, args);
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
			OnStartMacro: function (macroId, args) {
				console.info("Macro started: ", macroId, args);
			},
			OnEndMacro: function (macroId, args) {
				console.info("Macro ended: ", macroId, args);
			},
			goToLocation: function (result) {
				var location = result.location;
				this.views.board.setLocation(location);
			},
			findArtefact: function (result) {
				console.log("ARTEFACT FOUND!", result.artefact.id, result.artefact);
				var icon = this.urlMapper.image(result.artefact.icon, result.artefact.set.id);
				console.log("refreshing bar")
				this.views.board.inventoryBar.refresh();
				this.views.notifications.notify(icon, result.notification.title, result.notification.message, "Great!").show();
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
			this.views.welcome.show().startSoundtrack();
			this.timeline = new PP.Timeline(this.world);
			this.initController();
			return this;
		},
		startGame: function() {
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
			this.views.board.show();
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
					set = new PP.Set(data);
					self.world.sets.store(id, set);
					//console.log("Set loaded: manifest: ", set, id);
					self.world.boards.update(set.boards);
					self.world.marks.update(set.marks);
					self.world.artefacts.update(set.artefacts);
					self.world.characters.update(set.characters);
					self.world.macros.update(set.macros);
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
		x: 0,
		y: 0,
		initialize: function (view, x, y) {
			this.callSuper();
			this.x = x || 0;
			this.y = y || 0;
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
			return this;
		},
		initUI: function () {
			/* to be overriden */
			return this;
		},
		show: function () {
			console.log(this.set.length);
			if (!this.visible) {
				this.set.length && this.set
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
			this.set.remove();
		}
	});

	PP.StatusBar = new JS.Class(PP.PaperObject, {
		initUI: function () {
			var set = this.set,
				paper = this.paper;
			set.background = paper
				.image("images/statusBar-Background.png", 0, 0, 960, 111, 0);
			set.iconBg = paper
				.rect(10, 10, 86, 86, 22)
				.attr({
					"fill": "#000"
				});
			set.icon = paper
				.image("", 13, 13, 80, 80);
			set.title = paper
				.text(110, 27, "")
				.attr({
					"fill": "#fff",
					"font-size": "24px",
					"text-anchor": "start"
				});
			set.description = paper
				.text(110, 52, "")
				.attr({
					"fill": "#fff",
					"font-size": "16px",
					"text-anchor": "start"
				});
			// todo: Can this be done in a single call ?
			set.push(set.background);
			set.push(set.iconBg);
			set.push(set.icon);
			set.push(set.title);
			set.push(set.description);
			return this;
		},
		placeMark: function(mark) {
			var self = this,
				set = this.set,
				paper = this.paper,
				location,
				icon;

			if (mark) {
				icon = player.urlMapper.image(mark.icon, player.timeline.current.location.setId) || "";
				if (mark.type === "destination") {
					location = new PP.Location(mark.destination, self.player.world);
					icon = player.urlMapper.image(location.board.icon, location.setId);
				} else if (mark.type === "macro") {
				} else if (mark.type === "character") {
				}
				set.icon.attr("src", icon);
				set.title.attr("text", mark.title);
				set.description.attr("text", "");
			}
			return this;
		},
		refresh: function() {
			var set = this.set,
				paper = this.paper,
				location = this.player.timeline.current.location;
			if (location) {
				set.icon.attr("src", player.urlMapper.image(location.board.icon, location.setId));
				set.title.attr("text", location.title());
				set.description.attr("text", location.board.description);
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
			set.push(set.background);
			return this;
		}
	});

	PP.ActingCharacter = new JS.Class(PP.PaperObject, {
		character: null,
		mark: null,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
			this.set.imgPose = paper
				.image("", 0, 0, 0, 0)
				.attr({
					"cursor": "pointer"
				});

			set.push(set.imgPose);
			return this;
		},
		place: function () {
			var self = this,
				player = this.player,
				paper = this.paper,
				location = this.player.timeline.current.location,
				set = this.set,
				imgPoseURL,
				imgPose,
				pose,
				mark,
				x,
				y,
				width,
				height;
			this.character = player.timeline.current.character;
			pose = this.character.poses.get("standing");
			imgPoseURL = player.urlMapper.image(pose.image, location.setId);
			mark = this.mark = location.mark;
			player.views.board.actionArrow.place(mark, mark, 0, -250, 0, -250).hide();
			height = 400 * mark.z;
			width = 200 * mark.z;
			x = 960 * mark.x - (width / 2);
			y = 540 * mark.y - height;
			this.set.imgPose.attr({
				"src": imgPoseURL,
				"x": x,
				"y": y,
				"width": width,
				"height": height
			}).click(function () {
				var board = player.views.board
				board.statusBar.refresh().show();
				board.highlight.show();
			});
			return this;
		}
	});

	// todo: refactor: should be initialized with mark (with infered board and view from board)... not mark+view
	PP.ActingArtefact = new JS.Class(PP.PaperObject, {
		artefact: null,
		mark: null,
		initialize: function(mark, view) {
			this.callSuper(view);
			this.mark = mark;
			//todo: could this be simplified by having artefact already loading in the mark
			// like this:  artefact = this.mark.artefact
			this.artefact = this.player.world.artefacts.get(mark.artefact);
		},
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;
			this.set.imgPose = paper
				.image("", 0, 0, 0, 0)
				.attr({
					"cursor": "pointer"
				});
			set.push(set.imgPose);
			return this;
		},
		place: function () {
			var self = this,
				player = this.player,
				paper = this.paper,
				location = this.player.timeline.current.location,
				set = this.set,
				imgPoseURL,
				imgPose,
				pose,
				board = player.views.board,
				mark = this.mark,
				x,
				y,
				width,
				height;
			pose = this.artefact.poses.get(mark.pose);
			imgPoseURL = player.urlMapper.image(pose.image, this.artefact.set.id);
			height = 200 * mark.z;
			width = 200 * mark.z;
			x = 960 * mark.x - (width / 2);
			y = 540 * mark.y - height;
			this.set.imgPose.attr({
				"src": imgPoseURL,
				"x": x,
				"y": y,
				"width": width,
				"height": height
			}).insertAfter(board.set.background);
			return this;
		}
	});


	PP.MarkSet = new JS.Class(PP.PaperObject, {
		marks: null,
		smallMarks: null,
		artefacts: null,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				player = this.player;

			this.marks = paper.set();
			this.smallMarks = paper.set();
			this.artefacts = new JS.Hash();

			set.push(set.background);
			return this;
		},
		unHook: function() {
			var board = this.player.views.board;
			this.marks.hide();
			board.actionArrow.place(board.character.mark, board.character.mark, 0, -250, 0, -250, function() {
				board.actionArrow.hide();
			});
		},
		place: function () {
			var self = this,
				set = this.set,
				paper = this.paper,
				player = this.player,
				location = player.timeline.current.location,
				boardView = player.views.board,
				board = location.board;

			this.marks.remove();
			this.smallMarks.remove();

			this.artefacts.forEach(function(artefact){
				console.log("artefact: ", artefact.value);
				artefact.value.destroy();
			});
			board.marks.forEachValue(function(mark) {
				var iconURL,
					iconURLSmall,
					imgMarkSmall,
					imgMark,
					OSSizeRatio = 1,
					iconOffsetX = 0,
					iconOffsetY = 0;
				if (IsiPhone || IsiPod) OSSizeRatio = 1.5;
				if (mark.type === "destination") {
					var destination = new PP.Location(mark.destination, self.player.world);
					var destinationIcon = player.urlMapper.image(destination.board.icon, destination.setId);
					iconURL = destinationIcon || "images/icon-walk.png";
					iconURLSmall = "images/icon-arrow-dot.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else if (mark.type === "character") {
					iconURL = "images/icon-walk.png";
					iconURLSmall = "images/icon-character-small.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-40*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else if (mark.type === "artefact") {
					var artefact = player.world.artefacts.get(mark.artefact);
					console.log("artefact: ", artefact, player.world);
					var artefactIcon = player.urlMapper.image(artefact.icon, artefact.set.id);
					console.log("artefactIcon: ", artefactIcon);
					var actingArtefact = new PP.ActingArtefact(mark, this.player.views.board).place();
					self.artefacts.store(mark.id, actingArtefact);
					iconURL = artefactIcon || "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else if (mark.type === "macro") {
					iconURL = "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				} else {
					iconURL = "images/icon-questionMark.png";
					iconURLSmall = "images/icon-questionMark-dot.png";
					if (mark.icon) {
						iconURL = player.urlMapper.image(mark.icon, location.setId);
					}
					imgMarkSmall = paper.image(iconURLSmall, 960*mark.x-20*OSSizeRatio, 540*mark.y-20*OSSizeRatio, 40*OSSizeRatio, 40*OSSizeRatio);
					imgMark = paper.image(iconURL, 960*mark.x-31*OSSizeRatio, 540*mark.y-31*OSSizeRatio, 64*OSSizeRatio, 64*OSSizeRatio).hide();
				}
				imgMark.attr({
					"cursor": "pointer"
				});
				imgMarkSmall.attr({
					"cursor": "pointer"
				});
				imgMarkSmall.mouseover(function(e){
					var characterMark = boardView.character.mark;
					self.marks.hide();
					imgMark.show();
					self.hoveredMark = mark;
					boardView.actionArrow.show().place(characterMark, mark, iconOffsetX, iconOffsetY, 0, -250);
				});
				imgMark.click(function(e){
					if (mark.type === "destination") {
						player.controller.run("goToLocation", {path: mark.destination});
					} else if (mark.type === "character") {
						var path = location.setId + "/" + location.boardId + "#" + mark.id;
						self.unHook();
						player.controller.run("goToLocation", {path: path});
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					} else if (mark.type === "macro") {
						self.unHook();
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					} else {
						self.unHook();
						if (mark.macro) player.controller.runMacro(mark.macro, {});
					}

				});
				self.marks.push(imgMark);
				self.smallMarks.push(imgMarkSmall);
			});
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
				arrow2,
				shadow,
				tip,
				label,
				labelShadow;
			arrow = set.arrow = paper
				.path(path)
				.hide()
				.insertAfter(this.view.highlight.set.background)
				.attr({
					"stroke": "#fff",
					"stroke-linecap": "round",
					"stroke-width": 8
				});

			shadow = set.shadow = paper
				.path(path)
				.hide()
				.insertBefore(arrow)
				.attr({
					"stroke": "#000",
					"opacity": 0,
					"stroke-linecap": "round",
					"stroke-width": 12
				});

			tip = set.tip = paper
				.image("images/icon-selected.png", 0, 0, 100, 100)
				.hide()
				.insertAfter(arrow);

			labelShadow = set.labelShadow = paper
				.text("", 0, 0)
				.hide()
				.insertAfter(tip)
				.attr({
					"fill": "#000",
					"font-size": "18px",
					"text-anchor": "middle",
					"opacity": 0.5
				});
			label = set.label = paper
				.text("", 0, 0)
				.hide()
				.insertAfter(labelShadow)
				.attr({
					"fill": "#fff",
					"font-size": "18px",
					"text-anchor": "middle"
				});

			set.push(arrow);
			set.push(shadow);
			set.push(label);
			set.push(labelShadow);
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
				pathShadow,
				title;
			if (sourceMark && targetMark) {
				x = targetMark.x * 960 + (targetOffsetX * targetMark.z || 1);
				y = targetMark.y * 540 + (targetOffsetY * targetMark.z || 1);
				x2 = sourceMark.x * 960 + (sourceOffsetX * sourceMark.z);
				y2 = sourceMark.y * 540 + (sourceOffsetY * sourceMark.z);
				path = "M" + x + " " + y + "L" + x2 + " " + y2;
				pathShadow = "M" + x + " " + (y + this.shadowOffset) + "L" + x2 + " " + (y2 + this.shadowOffset);
				title = targetMark.title;
				set.arrow.animate({
					path: path
				}, 200);
				set.shadow.animate({
					path: pathShadow
				}, 200);
				set.label.attr({
					"text": title,
					"x": x,
					"y": y + 60
				});
				set.labelShadow.attr({
					"text": title,
					"x": x - 1,
					"y": y + 62
				});
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
	PP.InventoryBar = new JS.Class(PP.PaperObject, {
		character: null,
		itemsPerPage: 5,
		iconsSize: 50,
		iconsInterval: 15,
		initUI: function () {
			var self = this,
				set = this.set,
				paper = this.paper;

			return this;
		},
		databind: function(character) {
			this.character = character || null;
			this.refresh();
			return this;
		},
		refresh: function () {
			var self = this,
				paper = this.paper,
				set = this.set,
				inventory = this.character.inventory,
				inventoryItem,
				count,
				x,
				y,
				icon,
				width,
				height;

			set.remove();

			inventory = this.character && this.character.inventory;

			if (inventory) {
				if (inventory.length > 0) {
					height = this.iconsSize + 20;
					width = ((inventory.length) * (self.iconsSize + self.iconsInterval)) - self.iconsInterval + 20;
					set.background = paper
						.rect(self.x, self.y, width, height, 10)
						.attr({
							"fill": "#000",
							"opacity": 0.6
						});
					set.push(set.background);
				}
				count = 0;
				inventory.forEach(function (item) {
					var artefact = item.value;

					count = count + 1;
					x = self.x + ((count-1) * (self.iconsSize + self.iconsInterval)) + 10;
					y = self.y + 10;
					icon = self.player.urlMapper.image(artefact.icon, artefact.set.id);

					inventoryItem = paper
						.image(icon, x, y, self.iconsSize, self.iconsSize)
						.attr({
							"cursor": "pointer"
						})
							.mouseover(function () {
								this.attr({
									scale: 1.05,
									rotation: 5,
									x: this.attr("x") + 3,
									y: this.attr("y") - 3
								});
							})
							.mouseout(function () {
								this.attr({
									scale: 1,
									rotation: 0,
									x: this.attr("x") - 3,
									y: this.attr("y") + 3
								});
							})
							.click(function () {
									self.player.views.notifications
											.notify(icon, artefact.title, artefact.description, "Close")
											.show();

//								alert("must show item here...");
							});
					set.push(inventoryItem);
				});
			};

			return this;
		}
	});

	PP.View = new JS.Class(PP.Observer, {
		player: null,
		paper: null,
		root: null,
		set: null,
		visible: false,
		inFocus: false,
		initialize: function (rootId, player) {
			this.callSuper();
			this.player = player;
			this.paper = Raphael(rootId, player.width, player.height);
			this.set = this.paper.set();
			this.root = $("#" + rootId);
			this.hide();
			this.initUI();
			if (!IsiPhoneOS) {
				this.initKeyboard();
			}
			return this;
		},
		initKeyboard: function () {
			/* to be overriden */
			return this;
		},
		initUI: function() {
			/* to be overriden */
			return this;
		},
		focus: function () {
			this.inFocus = true;
			this.publish("onFocus");
			return this;
		},
		blur: function () {
			this.inFocus = false;
			this.publish("onBlur");
			return this;
		},
		show: function () {
			console.log("showing", this.root);
			this.visible = true;
			this.root.fadeIn(250);
			this.publish("onShow");
			return this;
		},
		hide: function (keepFocus) {
			console.log("hidding", this.root);
			this.visible = false;
			this.root.fadeOut(350);
			this.publish("onHide", [keepFocus]);
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
	PP.WelcomeView = new JS.Class(PP.View, {
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
	PP.BoardView = new JS.Class(PP.View, {
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

	PP.NotificationsView = new JS.Class(PP.View, {
		initialize: function(rootId, player) {
			this.callSuper(rootId, player);
		},
		initUI: function () {
			var view = this,
				player = this.player,
				paper = this.paper;

			//			if (this.set.glowEffect) this.set.glowEffect.stop();

			function GlowEffect(x, y, size, speed, paper) {
				var w = 295 * size,
					h = 295 * size,
					centerX = x - (w/2),
					centerY = y - (h/2);

				Raphael.el.glowEffectTurn = function (timespan, clockwise) {
					var degrees = 360 * ((clockwise) ? 1 : -1);

					this.animate({
						"rotation": degrees
					}, timespan, function(){
						this.attr({
							"rotation": 0
						});
						this.glowEffectTurn(timespan, clockwise);
						return this;
					});
					return this;
				};
				Raphael.el.dim = function (opacity) {
					this.attr({
						"opacity": opacity
					});
					return this;
				};
				this.burstA = paper
						.image("images/glow/burstA.png", centerX, centerY, w, h)
						.dim(0.6);
				this.burstB = paper
						.image("images/glow/burstB.png", centerX, centerY, w, h)
						.dim(0.6);
				this.burstC = paper
						.image("images/glow/burstB.png", centerX, centerY, w, h)
						.dim(0.6);

				this.stop = function() {
					this.burstA.stop();
					this.burstB.stop();
					this.burstC.stop();
				};
				this.turn = function () {
					this.burstA.glowEffectTurn(70000/speed, false);
					this.burstB.glowEffectTurn(50000/speed, true);
					this.burstC.glowEffectTurn(110000/speed, false);
				};

//				this.glow = paper
//					.image("images/glow/glow.png", x, y, w, h);
			}


			this.set.background = paper
				.rect(0, 0, 960, 540, 0).attr({
					opacity: 0.4,
					fill: "#000"
				});
			this.set.backgroundImage = paper
				.image("images/highlight.png", 0, 0, 960, 540, 0)

			this.set.glowEffect = new GlowEffect(310, 155, 0.9, 0.7, paper);
			
			this.set.icon = paper
				.image("", 250, 80, 130, 130, 0);

			this.set.details = $("<div class='ppPanel'></div>").css({
				color: "#fff",
				top: "80px",
				left: "400px",
				width: "400px"
			}).appendTo(this.root);

			this.set.title = $("<h2>title</h2>")
				.css({
					"font-size": "26px",
					"margin": "0px 0px 15px 0px"
				})
				.appendTo(this.set.details);

			this.set.message = $("<div>descr</div>")
				.css({
					"font-size": "18px",
					"margin": "0px 0px 15px 0px"
				})
				.appendTo(this.set.details);

			this.set.btnOk = $("<button>Ok</button>")
				.css({
					"font-size": "18px"
				})
				.click(function () {
					view.hide();
				})
				.appendTo(this.set.details);

			this.set.push(
					this.set.icon,
					this.set.background,
					this.set.backgroundImage);


		},
		notify: function(iconURL, title, message, btnOkLabel) {
			this.set.icon.attr({
				src: iconURL
			});
			this.set.title.html(title || "");
			this.set.message.html(message || "");
			this.set.btnOk.html(btnOkLabel || "");
			return this;
		},
		initKeyboard : function () {
			var self = this;
			$(document).keyup(function(e) {
				if (!e.isPropagationStopped()) {
					if (e.which == 27) {
						console.log(self);
						if (self.inFocus) {
							self.hide();
							e.stopPropagation();
						}
					}
				}
			});
			return this;
		},
		showz: function () {
			this.visible = true;
			this.set.details.css({
				"margin-top": -50,
				"opacity": 0
			})
			this.set.glowEffect.turn();
			this.root.fadeIn(150);
			this.set.details
				.animate({
					"margin-top": 0,
					"opacity": 1
				}, 500);
			return this;
		}
	});

})(jQuery, PocketPeople);