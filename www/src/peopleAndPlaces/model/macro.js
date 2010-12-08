
(function($, PP){

	var Model = PP.Model;

	Model.MacroSet = new JS.Class(Model.ModelObject, {
		type: "macroSet",
		url: "",
		source: "",
		scripts: null,
		macros: null,
		initialize: function(id, state, parent) {
			this.macros = {};
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.url = state.url;
			return this;
		},
		compile: function(source) {
			this.source = source;
			var i,
				macro,
				macroId = "",
				macroBuffer = [],
				line,
				lines = source.split("\n");
			for (i = 0; i<lines.length; i = i + 1) {
				line = lines[i];
				if (line.substring(0,6) === "macro:") {
					if (macroId) {
						macro = new Model.Macro(macroId, {
							source: macroBuffer
						}, this);
						macroBuffer = [];
					}
					macroId = line.substring(6, 999);
					macroBuffer = [];
				} else {
					macroBuffer.push(line);
				}

			}
			// todo : create multiple macros from the source code
			return this;
		}
	});
	Model.Macro = new JS.Class(Model.ModelObject, {
		type: "macro",
		title: "",
		methods: null,
		initialize: function(id, state, parent) {
			this.methods = {};
			this.callSuper(id, state, parent);
		},
		setState: function (state) {
			this.title = state.title;
			this.source = state.source;
			this.methods = this.compile(state.source);
			return this;
		},
		compile: function(source) {
			var parsedMacro,
				parser;
			parser = new PP.Macro.Parser();
//			console.log("parser: ", parser);
			parsedMacro = parser.parse(this.source);
//			console.log("parsedMacro : ", parsedMacro);
			this.methods = PP.Macro.Compile(parsedMacro);
			return this;
		},
		run: function (_id) {
			var id = _id || "begin";
			var runtimeEnvironment = {};
			this.methods[id].call(runtimeEnvironment);
			return this;
		}
	});

	PP.Macro = {};
	PP.Macro.Parser = function () {

		this.linesBuffer = null;

		this.parse = function (sources) {
			this.linesBuffer = sources;
			this.obj = {};
			this.cursor = {
				stack: [this.obj],
				parent: this.obj,
				last: this.obj,
				indent: null
			};
			while (this.linesBuffer.length > 0 ) {
				this.parseLine(this.linesBuffer.splice(0,1)[0] || "", this.cursor);
			}
			return this.obj;
		};

		this.parseLine = function (_line, c) {
			var i,
				type,
				newLabel,
				newIndent,
				newValue,
				splitTokens,
				tokenA,
				tokenB,
				indentOffset,
				trimmedLine = _line.trim();

			if (trimmedLine && trimmedLine.substring(0,2) !== "//") {
				// Set indentation markers
				newIndent = (_line.match(/^\t+/g) || [""])[0].length;
				if (c.indent === null) c.indent = newIndent;
				indentOffset =  c.indent - newIndent;
				c.indent = newIndent;

				//console.log("tick");
				splitTokens = trimmedLine.split(":");
				tokenA = splitTokens[0];
				tokenB = splitTokens[1] || "";

				// determine the nature of the new element
				if (tokenB) {
					// line is a property
					type = "property";

					newLabel = tokenA;
					newValue = tokenB;
				} else {
					// line is an object or an array
					if (tokenA.trim()[0] === '[' && tokenA.trim()[tokenA.length-1] === ']') {
						type = "array";
						newLabel = tokenA.substring(1, tokenA.trim().length - 1);
						newValue = [];
					} else {
						type = "object";
						newLabel = tokenA;
						newValue = {};
					}
				}
				// determines where this new element should be place
				// according to the indentation
				if (indentOffset >= 0) {
					// If the indent has moved back, the stack is popped
					// according to the number of tab offest
					for (i = indentOffset; i > 0; i = i - 1) {
						c.stack.pop();
						c.parent = c.stack[c.stack.length - 1];
					}
				} else {
					c.stack.push(c.parent = c.last);
				}
				if (type !== "property" && c.parent.pop) {
					c.parent.push([newLabel, newValue]);
				} else {
					c.parent[newLabel] = newValue;
				}
				c.last = newValue;
			}
		};
	};

	PP.Macro.Compile = function(obj) {
		// Parse each sequences
		function parseSequences(items) {
			var methods = {};
			_(items).each(function (value, key, list) {
				//console.log(value, "||", key, "||", list);
				var fn = parseValue(value, {
					array: parseMacroCommands
				});
				methods[key] = fn;
				//console.log(key, fn.toString());
			});
			return methods;
		}
		function parseMacroCommands(items) {
			var fnString = "";
			fnString = fnString.concat("return function (env) {\n");
			_(items).each(function (value, key, list) {
				var command = value[0],
					args = value[1],
					argString = parseArguments(args);
				fnString = fnString.concat("env.", command, "(", argString, ");\n");
			});
			fnString = fnString.concat("};");
			//console.log(fnString);
			return new Function(fnString)();
		}
		function parseArguments(items) {
			var argString = "";
			_(items).each(function (value, key, list) {
				//console.log("value: ", value);
				var valueString = parseValue(value);
				argString = argString.concat("\t", key, ": ", valueString, ",\n");
			});
			if (_(items).size()>0) {
				argString = "".concat("{\n", argString.substring(0, argString.length-2) ,"\n}");
			}
			return argString;
		}
		function IsNumeric(input) {
		   return (input - 0) == input && input.length > 0;
		}
		function parseValue(value, _handlers) {
			var handler,
				handlers = _handlers || {},
				returnValue;
			if (_(value).isArray()) {
				handler = handlers.array || parseArray;
				returnValue = handler(value);
			} else if (typeof(value) === "object") {
				returnValue = parseObject(value);
			} else if (typeof(value) === "string") {
				returnValue = parseString(value);
			} else if (typeof(value) === "undefined") {
				returnValue = "'[undefined value]'";
			} else {
				returnValue = "'[unknown type]'";
			}
			return returnValue
		}
		function parseObject(items) {
			var argString = "";
			_(items).each(function (value, key, list) {
//							console.log("value: ", value);
				var valueString = parseValue(value, {});
				argString = argString.concat("\t", key, ": ", valueString, ",\n");
			});
			if (_(items).size()>0) {
				argString = "".concat("{\n", argString.substring(0, argString.length-2) ,"\n}");
			}
			return argString;
		}
		function parseArray(value) {
			return "'[array]'";
		}
		function parseString(_value) {
			var returnValue,
				value = _value.trim();
			if (value[0] === '"' && value[value.length-1] === '"') {
				// todo: escape illegal characters
				returnValue = new String(value.substring(1,value.length-1));
				returnValue = "".concat('"', returnValue, '"');
			} else if (IsNumeric(value)) {
				returnValue = value - 0;
			} else if (value.indexOf(" ") < 0 && value.indexOf("@") >= 0) {
				returnValue = "".concat('env.getObjectFromInventory("', value, '")');
			} else if (value.substring(value.length - 2) === "()") {
				returnValue = "".concat('env.callMacroLabel(this, "', value.substring(0, value.length - 2) ,'")');
			} else {
				returnValue = "'[unknown type or reference]'";
			}
			return returnValue;
		}
		return parseSequences(obj || {});
	};


})(jQuery, PocketPeople);


