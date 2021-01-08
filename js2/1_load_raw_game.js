async function load_raw_game(gameName = globalThis.gameName) {
	console.time('load_raw_game');
	if (!globalThis.gameName) {
		globalThis.gameName = gameName;
	}

	// if (!globalThis.nw) {
	// 	await fetch.cached(`./data/${gameName}.game.json`);
	// 	await fetch.cached(`./data/${gameName}.raw.json`);
	// }

	globalThis.game = await fs.load_json(`./data/${gameName}.game.json`);
	globalThis.raw = await fs.load_json(`./data/${gameName}.raw.json`);

	let shouldReSave = false;
	digObject({ game }, (o, k, ok, path) => {
		if (ok._values().length == 0) {
			if (!Array.isArray(ok)) {
				o[k] = [];
				shouldReSave = true;
			}
		}
	});
	if (shouldReSave) {
		fs.json(`./data/${gameName}.game.json`, game);
	}

	/** @type {Object.<string, function>} */
	let luaClassList = globalThis.luaClassList = {};

	/**
	 @param {(o, k:string, ok:number, path:string[])=>void} fn
	 */
	function digObject(o, fn, path = []) {
		for (let k in o) {
			if (typeof (o[k]) == 'object' && o[k] != null) {
				path.push(k);
				digObject(o[k], fn, path);
				fn(o, k, o[k], path);
				path.pop();
			}
		}
	}

	let warnObjectTypeSet = new Set();
	digObject({ game }, (o, k, ok, path) => {
		if (!ok._type || ok._type.startsWith('^')) return;
		if (ok._type != ok.object_name) {
			if (!warnObjectTypeSet.has(ok._type)) {
				warnObjectTypeSet.add(ok._type);
				console.warn('missing object_name', ok, path.join('.'));
			}
		}

		if (!luaClassList[ok.object_name]) {
			luaClassList[ok.object_name] = eval(`(()=>{
				let c = class ${ok.object_name} {};
				c.prototype.object_name = c.prototype._type = '${ok.object_name}';
				return c;
			})()`);
		}
		Object.setPrototypeOf(ok, luaClassList[ok.object_name].prototype);
		delete ok._type;
		delete ok.object_name;
	});

	function objectId({ object_name = '', name = '', type = '', force: { name: fname = '' } = {}, index = '' }) {
		return `${object_name}.${name}.${type}.${fname}.${index}`;
	}

	let idMap = new Map();

	let noPointerTypes = {
		LuaFluidBoxPrototype: true,
		LuaBurnerPrototype: true,
		LuaElectricEnergySourcePrototype: true,
		LuaHeatEnergySourcePrototype: true,
		LuaFluidEnergySourcePrototype: true,
		LuaVoidEnergySourcePrototype: true,
	};

	digObject({ game }, (o, k, ok, path) => {
		if (!ok._type) return;
		if (ok._type.startsWith('^')) return;
		if (noPointerTypes[ok._type]) return;

		let id = objectId(ok);
		if (idMap.has(id)) {
			console.warn('Duplicate object in game:', id, ok);
			if (JSON.stringify(idMap.get(id)) != JSON.stringify(ok)) {
				throw 'Different objects with same id in game'
			}
			o[k] = ok;
		}

		return idMap.set(id, ok);
	});

	digObject({ game }, (o, k, ok, path) => {
		if (!ok._type) return;
		if (!ok._type.startsWith('^')) return;

		let id = objectId(ok);
		if (!idMap.has(id)) {
			if (!warnObjectTypeSet.has(id)) {
				warnObjectTypeSet.add(id);
				console.log('missing ^pointer to', id, 'at', path.join('.'));
			}
		}

		o[k] = idMap.get(id);
	});

	luaClassList.LuaFluidPrototype.prototype.type = 'fluid';
	luaClassList.LuaVirtualSignalPrototype.prototype.type = 'virtual-signal';
	luaClassList.LuaRecipePrototype.prototype.type = 'recipe';
	luaClassList.LuaRecipe.prototype.type = 'recipe';


	make_fixes();

	add_helper_recipes();

	console.timeEnd('load_raw_game');
	log('%c Game and Raw are loaded, recursive links restored!', 'font-weight: bold;')

}


function make_fixes() {
	for (let k in raw) {
		if (raw[k][""]) {
			raw[k][""].name = "simple-entity";
			raw[k][""]["simple-entity"] = raw[k][""];
			delete raw[k][""];
		}
	}
	for (let k in game) {
		if (game[k][""]) {
			game[k][""].name = "simple-entity";
			game[k][""]["simple-entity"] = game[k][""];
			delete game[k][""];
		}
	}
}

function add_helper_recipes() {

	for (let pump of game.entity_prototypes._values().filter(e => e.type == 'offshore-pump')) {
		let pumpRecipe =
			Object.assign(new luaClassList.LuaRecipe(), {
				category: pump.name,
				enabled: true,
				energy: 1,
				hidden: false,
				ingredients: [],
				name: 'pumping--' + pump.name,
				products: [{
					type: 'fluid',
					name: pump.fluid.name,
					probability: 1,
					amount: pump.pumping_speed * 60,
				}],
				prototype: null,
				main_product: pump.fluid,
				group: {
					name: 'calc-helper',
				},
				subgroup: {
					name: 'calc-helper-pump',
				},
				force: { name: 'neutral' },
			});

		pumpRecipe.prototype = pumpRecipe;
		for (let f of Object.values(game.forces)) {
			f.recipes[pumpRecipe.name] = pumpRecipe;
		}
		raw.recipe[pumpRecipe.name] = pumpRecipe;
	}

}


Object.assign(globalThis, {
	load_raw_game
});