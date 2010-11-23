
//todo: refactor
function BlockMove(event) {
	event.preventDefault() ;
}
//todo: see if Modernizr can do this instead
IsiPhone = navigator.userAgent.indexOf("iPhone") != -1;
IsiPod = navigator.userAgent.indexOf("iPod") != -1;
IsiPad = navigator.userAgent.indexOf("iPad") != -1;
IsiPhoneOS = IsiPhone || IsiPad || IsiPod;

(function($){

	var PP = {};
	this.PocketPeople = PP;

	var utils = PP.Utils = {};

	PP.Observer = new JS.Class({
		// the topic/subscription hash
		cache: null,
		initialize: function () {
			this.cache = {};
		},
		publish: function(/* String */topic, /* Array? */args){
			// summary:
			//		Publish some data on a named topic.
			// topic: String
			//		The channel to publish on
			// args: Array?
			//		The data to publish. Each array item is converted into an ordered
			//		arguments on the subscribed functions.
			//
			// example:
			//		Publish stuff on '/some/topic'. Anything subscribed will be called
			//		with a function signature like: function(a,b,c){ ... }
			//
			//	|		$.publish("/some/topic", ["a","b","c"]);
			$.each(this.cache[topic], function(){
				this.apply($, args || []);
			});
		},
		subscribe: function(/* String */topic, /* Function */callback){
			// summary:
			//		Register a callback on a named topic.
			// topic: String
			//		The channel to subscribe to
			// callback: Function
			//		The handler event. Anytime something is $.publish'ed on a
			//		subscribed channel, the callback will be called with the
			//		published array as ordered arguments.
			//
			// returns: Array
			//		A handle which can be used to unsubscribe this particular subscription.
			//
			// example:
			//	|	$.subscribe("/some/topic", function(a, b, c){ /* handle data */ });
			//
			if(!this.cache[topic]){
				this.cache[topic] = [];
			}
			this.cache[topic].push(callback);
			return [topic, callback]; // Array
		},
		unsubscribe: function(/* Array */handle){
			// summary:
			//		Disconnect a subscribed function for a topic.
			// handle: Array
			//		The return value from a $.subscribe call.
			// example:
			//	|	var handle = $.subscribe("/something", function(){});
			//	|	$.unsubscribe(handle);

			var cache = this.cache,
				t = handle[0];
			cache[t] && $.each(cache[t], function(idx){
				if(this == handle[1]){
					cache[t].splice(idx, 1);
				}
			});
		}
	});

	PP.Location = new JS.Class({
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
			this.set = world.sets.get(this.setId);
			this.board = world.boards.get(this.boardId);
			this.mark = this.board.marks.get(this.markId);

			// todo: get reference to the set, board and mark objects
		},
		title: function() {
			return this.board.title;
		}
	});

	PP.World = new JS.Class({
		settings: {},
		id: null,
		title: "",
		seed: "",
		defaultState: "",
		sets: null,
		boards: null,
		marks: null,
		characters: null,
		artefacts: null,
		initialize: function (settings) {
			$.extend(this.settings, settings);

			this.sets = new JS.Hash();
			this.boards = new JS.Hash();
			this.marks = new JS.Hash();
			this.characters = new JS.Hash();
			this.artefacts = new JS.Hash();

			this.id = settings.id;
			this.title = settings.title;
			this.seed = settings.seed;
			this.defaultState = settings.defaultState;
		}
	});

	PP.Set = new JS.Class({
		settings: {},
		id: null,
		title: "",
		seed: "",
		boards: null,
		marks: null,
		characters: null,
		artefacts: null,
		initialize: function (settings) {
			var self = this;
			this.boards = new JS.Hash();
			this.marks = new JS.Hash();
			this.characters = new JS.Hash();
			this.artefacts = new JS.Hash();
			$.extend(this.settings, settings);
			this.id = settings.id;
			this.title = settings.title;
			this.seed = settings.seed;
			$.each(this.settings.boards, function (id) {
				var board = new PP.Board(id, this);
				self.boards.store(board.id, board);
				self.marks.update(board.marks);
			});
			$.each(this.settings.characters, function (id) {
				var character = new PP.Character(id, this);
				self.characters.store(character.id, character);
			});
			$.each(this.settings.artefacts, function (id) {
				var artefact = new PP.Artefact(id, self, this);
				self.artefacts.store(artefact.id, artefact);
			});
		}
	});

	PP.Board = new JS.Class({
		settings: {},
		id: null,
		title: "",
		description: "",
		icon: "",
		marks: null,
		backgroundImage: "",
		soundtrack: "",
		initialize: function (id, settings) {
			var self = this;
			this.marks = new JS.Hash();
			$.extend(this.settings, settings);
			this.id = id;
			this.title = settings.title || null;
			this.description = settings.description || null;
			this.icon = settings.icon || null;
			this.backgroundImage = settings.backgroundImage;
			this.soundtrack = settings.soundtrack;
			$.each(this.settings.marks, function (markId) {
				var mark = new PP.Mark(markId, this);
				self.marks.store(markId, mark);
			});
		}
	});

	PP.Mark = new JS.Class({
		settings: {},
		id: null,
		title: "",
		type: "",
		x: 0,
		y: 0,
		z: 0,
		artefact: null,
		pose: null,
		destination: "",
		icon: null,
		initialize: function (id, settings) {
			$.extend(this.settings, settings);
			this.id = id;
			this.title = settings.title;
			this.type = settings.type;
			this.x = settings.x;
			this.y = settings.y;
			this.z = settings.z;
			this.icon = settings.icon;
			this.artefact = settings.artefact;
			this.pose = settings.pose;
			this.destination = settings.destination;
		}
	});

	PP.Artefact = new JS.Class({
		settings: {},
		id: null,
		title: "",
		description: "",
		icon: "",
		poses: null,
		set: null,
		initialize: function(id, set, settings) {
			var self = this;
			this.set = set;
			this.poses = new JS.Hash();
			$.extend(this.settings, settings);
			this.id = id;
			this.title = settings.title;
			this.description = settings.description;
			this.icon = settings.icon;
			$.each(this.settings.poses, function (id) {
				var pose = new PP.Pose(id, this);
				self.poses.store(id, pose);
			});
		}
	});


	PP.Character = new JS.Class({
		settings: {},
		id: null,
		name: "",
		fullname: "",
		poses: null,
		initialize: function (id, settings) {
			var self = this;
			this.poses = new JS.Hash();
			$.extend(this.settings, settings);
			this.id = id;
			this.name = settings.name;
			this.fullname = settings.fullname;
			$.each(this.settings.poses, function (poseId) {
				var pose = new PP.Pose(poseId, this);
				self.poses.store(poseId, pose);
			});
		}
	});

	/**
	 * Poses are used for both characters and artefcts
	 */
	PP.Pose = new JS.Class({
		settings: {},
		id: null,
		image: "",
		initialize: function (id, settings) {
			$.extend(this.settings, settings);
			this.id = id;
			this.image = settings.image;
		}
	});

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
			this.observer = observer = new PP.Observer();

			commands.goToLocation = function(args) {
				var location;
				location = new PP.Location(args.path, world);
				timeline.current.location = location;
				return {
					location: location
				}
			};
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
		state: function (newState) {
			var returnState;
			if (newState) {
				if (newState.locationPath) this.current.location = new PP.Location(newState.locationPath, this.world);
				if (newState.character) this.current.character = this.world.characters.get(newState.character);
			}
			returnState = {
				locationPath: (this.current.location) ? this.current.location.path : "",
				character: (this.current.character) ? this.current.character.id : ""
			};
			return returnState;
		}
	});

})(jQuery);