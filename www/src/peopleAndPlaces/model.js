
(function($, PP){

	var Model = PP.Model = {};

	Model.Serializable = new JS.Class({
		getState: function () {
			/* to overide with subClass */
			return {};
		},
		setState: function (state) {
			/* to overide with subClass */
			return this;
		}
	});

	Model.ModelCollection = new JS.Class(JS.Hash, {
		classConstructor: null,
		callback: null,
		parent: null,
		initialize: function (classConstructor, parent, callback) {
			this.classConstructor = classConstructor;
			this.callback = callback;
			this.parent = parent;
			this.callSuper();
			return this;
		},
		load: function (data) {
			if (data) {
				for (var member in data) {
					var newObject = new this.classConstructor(member, data[member], this.parent);
					this.store(newObject.hash(), newObject);
					if (this.parent.inventory) {
						this.parent.inventory.store(newObject.hash(), newObject);
					}
					function capitaliseFirstLetter(string) {
						return string.charAt(0).toUpperCase() + string.slice(1);
					}

					if (this.parent.publish) {
						this.parent.publish("onNew" + capitaliseFirstLetter(newObject.type), [this, newObject]);
					}
				}
			}
		}
	});

	Model.ModelObject = new JS.Class({
		type: "modelObject",
		include: [Model.Serializable, PP.Observer],
		id: null,
		parent: null,
		inventory: null,
		initialize: function(id, state, parent, onInitialize) {
			this.inventory = new JS.Hash();
			this.parent = parent;
			this.id = id;
			this.callSuper();
			if (onInitialize) onInitialize.call(this);
			this.setState(state);
			return this;
		},
		equals: function(other) {
            return (other instanceof this.klass) &&
                   other.hash() === this.hash();
        },
        hash: function() {
            return this.type + ":" + this.id + "@" + (this.parent.id || "root");
        }

	});

	Model.World = new JS.Class(Model.ModelObject, {
		type: "world",
		title: "",
		seed: "",
		defaultState: "",
		includeSets: null,
		inventory: null,
		initialize: function (id, state, parent) {
			this.inventory = new JS.Hash();
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.title = state.title;
			this.seed = state.seed;
			this.defaultState = state.defaultState;
			this.includeSets = state.includeSets;
			return this;
		},
		getState: function () {
		}
	});

	Model.Location = new JS.Class({
		world: null,
		path: "",
		setId: "",
		boardId: "",
		markId: "",
		set: null,
		board: null,
		mark: null,
		initialize: function (path, world) {
			var split1, split2;

			split1 = path.split("/");
			split2 = split1[1].split("#");

			this.worldId = world.id;
			this.setId = split1[0];
			this.boardId = split2[0];
			this.markId = split2[1];

			if (!this.markId) this.markId = "default";

			this.path = path;
			this.world = world;
			this.set = world.inventory.get("set:" + this.setId + "@root");
			this.board = world.inventory.get("board:" + this.boardId + "@" + this.setId);
			this.mark = this.board.marks.get("mark:" + this.markId + "@" + this.boardId);

			// todo: get reference to the set, board and mark objects
		},
		title: function() {
			return this.board.title;
		}
	});

	Model.Set = new JS.Class(Model.ModelObject, {
		type: "set",
		world: null,
		title: "",
		seed: "",
		icons: null,
		boards: null,
		marks: null,
		characters: null,
		artefacts: null,
		macros: null,
		initialize: function (id, state, parent) {
			var self = this;
			this.world = parent;
			this.icons = new Model.ModelCollection(Model.Icon, this);
			this.boards = new Model.ModelCollection(Model.Board, this, function(obj){
				// todo: bring back this
				// self.marks.update(obj.marks);
			});
			this.marks = new Model.ModelCollection(Model.Mark, this);
			this.characters = new Model.ModelCollection(Model.Character, this);
			this.artefacts = new Model.ModelCollection(Model.Artefact, this);
			this.macroSets = new Model.ModelCollection(Model.MacroSet, this);
			this.macros = new Model.ModelCollection(Model.Macro, this);
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			var self = this;
			this.title = state.title;
			this.seed = state.seed;
			this.icons.load(state.icons);
			this.boards.load(state.boards);
			this.characters.load(state.characters);
			this.artefacts.load(state.artefacts);
			this.macroSets.load(state.macroSets);
			this.macros.load(state.macros);
			return this;
		},
		loadMacros: function () {
		},
		getState: function () {
		}
	});

	Model.Icon = new JS.Class(Model.ModelObject, {
		type: "icon",
		url: null,
		initialize: function (id, state, parent) {
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.url = state.url || null;
			return this;
		}
	});

	Model.Board = new JS.Class(Model.ModelObject, {
		type: "board",
		title: "",
		description: "",
		icon: "",
		marks: null,
		backgroundImage: "",
		soundtrack: "",
		initialize: function (id, state, parent) {
			this.marks = new Model.ModelCollection(Model.Mark, this);
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.title = state.title || null;
			this.description = state.description || null;
			this.icon = state.icon || null;
			this.backgroundImage = state.backgroundImage;
			this.soundtrack = state.soundtrack;
			this.marks.load(state.marks);
			return this;
		}
	});

	Model.Mark = new JS.Class(Model.ModelObject, {
		type: "mark",
		title: "",
		markType: "",
		x: 0,
		y: 0,
		z: 0,
		artefact: null, // for type artefact
		pose: null, // for type character
		destination: "", // for type destination
		icon: null,
		macro: null, // for type action
		initialize: function (id, state, parent) {
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.title = state.title;
			this.markType = state.markType;
			this.x = state.x;
			this.y = state.y;
			this.z = state.z;
			this.icon = state.icon;
			this.artefact = state.artefact;
			this.pose = state.pose;
			this.destination = state.destination;
			this.macro = state.macro;
			return this;
		}
	});

	Model.Artefact = new JS.Class(Model.ModelObject, {
		type: "artefact",
		title: "",
		description: "",
		icon: "",
		poses: null,
		initialize: function(id, state, parent) {
			this.poses =  new Model.ModelCollection(Model.Pose, this);
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.title = state.title;
			this.description = state.description;
			this.icon = state.icon;
			this.poses.load(state.poses);
			return this;
		}
	});

	Model.Character = new JS.Class(Model.ModelObject, {
		type: "character",
		name: "",
		fullname: "",
		poses: null,
		inventory: null,
		initialize: function (id, state, parent) {
			this.poses = new JS.Hash();
			this.inventory = new JS.Hash();
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			var self = this;
			this.name = state.name;
			this.fullname = state.fullname;
			$.each(state.poses, function (poseId) {
				var pose = new Model.Pose(poseId, this);
				self.poses.store(poseId, pose);
			});
			return this;
		}
	});

	/**
	 * Poses are used for both characters and artefcts
	 */
	Model.Pose = new JS.Class(Model.ModelObject, {
		type: "pose",
		image: "",
		initialize: function (id, state, parent) {
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.image = state.image;
			return this;
		},
		getState: function () {
		}
	});

	Model.Notification = new JS.Class(Model.ModelObject, {
		type: "notification",
		icon: "",
		title: "",
		message: "",
		okLabel: "",
		initialize: function (id, state, parent) {
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.icon = state.icon;
			this.title = state.title;
			this.message = state.message;
			this.okLabel = state.okLabel;
			return this;
		}
	});


	/**
	 * The Timeline is the current state of the game and
	 * the log of transaction that have created this state
	 */
	Model.Timeline = new JS.Class(Model.ModelObject, {
		type: "timeline",
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
		setState: function (state) {
			if (state.locationPath) this.current.location = new Model.Location(state.locationPath, this.world);
			if (state.character) this.current.character = this.world.inventory.get(state.character);
			return this;
		},
		getState: function () {
			var state;
			state = {
				locationPath: (this.current.location) ? this.current.location.path : "",
				character: (this.current.character) ? this.current.character.hash() : ""
			};
			return state;
		}
	});
})(jQuery, PocketPeople);


