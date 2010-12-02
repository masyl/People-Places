
(function($, PP){

	var Model = PP.Model,
		Views = PP.Views;

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
				board: new Views.Board("boardView", this),
				options: new Views.Options("optionsView", this),
				pause: new Views.Pause("pauseView", this),
				notifications: new Views.Notifications("notificationsView", this),
				welcome: new Views.Welcome("welcomeView", this)
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
			}
			function onHideView(view, views, keepFocus) {
				//console.log("keepFocus", keepFocus);
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
			subscribe("symbolicAction");

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
				this.views.board.inventoryBar.refresh();
				var notification = result.notification;
				if (notification) {
					this.views.notifications.notify(notification.icon || result.artefact.icon, notification.title, notification.message, notification.okLabel || "Great!").show();
				}
			},
			symbolicAction: function (result) {
				var notification = result.notification;
				if (notification) {
					this.views.notifications.notify(notification.icon, notification.title, notification.message, notification.okLabel).show();
				}
			}
		},
		urlMapper: {
			world: function(id) {
				return "Worlds/" + id + "/manifest.json";
			},
			set: function(id) {
				return "Sets/" + id + "/manifest.json";
			},
			macroSet: function(id, setId) {
				return "Sets/" + setId + "/" + id + ".macro.txt";
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
			this.timeline = new Model.Timeline(this.world);
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
			this.timeline.setState(gameState);
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
				"game":  this.timeline.getState(),
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
				self.world = new Model.World(id, data, this);
				//console.log("World loaded: manifest: ", data);
				self.loadSets();
			});
			return this;
		},
		setsToLoad: 0,
		loadSets: function() {
			var self = this;
			//console.log("loading: ", self.world.settings.sets);
			$(self.world.includeSets).each(function() {
				self.setsToLoad = self.setsToLoad + 1;
			});
			$(self.world.includeSets).each(function() {
				var set,
					id = this+"", // Convert back to a simple string
					url = self.urlMapper.set(id);
				//console.log("loading: ", url);
				$.getJSON(url, function (data) {
					set = new Model.Set(id, data, self.world, function (){
						this.subscribe("onNewMacroSet", function(macroSetCollection, macroSet) {
							var url = self.urlMapper.macroSet(macroSet.id, id);
							$.get(url, function (data) {
								macroSet.compile(data);
							});
						});
					});

					//todo: trigger loading/compiling of macros

					self.world.inventory.store(set.hash(), set);
					console.log("Set loaded: manifest: ", set, set.hash());
					self.world.inventory.update(set.inventory);
/*
					self.world.inventory.update(set.boards);
					// todo: resolved the possible conflict of marks with duplicate hash
					self.world.inventory.update(set.marks);
					self.world.inventory.update(set.artefacts);
					self.world.inventory.update(set.characters);
					self.world.inventory.update(set.macros);
*/
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

})(jQuery, PocketPeople);