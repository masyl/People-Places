
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

	PP.Views = {};

	/**
	 * Base class for handling events using publish/subscribe methods
	 */
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
			var subscription = this.cache[topic];
			if (subscription) {
				$.each(subscription, function(){
					this.apply($, args || []);
				});
			}
			return this;
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
			return this; // Array
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
			return this;
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
			var self = this,
				world,
				timeline,
				commands,
				observer;

			this.world = world = _world;
			this.timeline = timeline = _timeline;
			this.commands = commands = {};
			this.observer = observer = new PP.Observer();

			commands.goToLocation = function(args) {
				var location;
				location = new PP.Model.Location(args.path, world);
				timeline.current.location = location;
				return {
					location: location
				}
			};
			commands.findArtefact = function(args) {
				var artefact = world.inventory.get(args.artefact);
				var character = self.timeline.current.character;
				character.inventory.store(artefact.id, artefact);
				return {
					character: character,
					artefact: artefact,
					notification: args.notification
				}
			};
			commands.symbolicAction = function(args) {
				return {
					notification: args.notification
				}
			};
		},
		// todo: refactor: provide a runObject to cut down of id resolving
		// or use method overloading
		run: function (commandId, args) {
			console.log(commandId, args);
			var command,
				value;
			command = this.commands[commandId];
			if (command) {
				value = command(args) || {};
				this.observer.publish(commandId, [value]);
				this.observer.publish("run", [commandId, args]);
			}
			return this;
		},
		// todo: refactor: provide a runMacroObject to cut down of id resolving
		// or use method overloading
		runMacro: function (macroId, args) {
			var macro, iCommand, command;
			macro = this.world.inventory.get(macroId);
			console.log("Macro object found: ", macro);
			if (macro) {
				this.observer.publish("startMacro", [macroId, args]);
				for (iCommand in macro.sequence) {
					command = macro.sequence[iCommand];
					this.run(command[0], command[1]);
				}
				this.observer.publish("endMacro", [macroId, args]);
			}
			return this;
		}
	});


})(jQuery);