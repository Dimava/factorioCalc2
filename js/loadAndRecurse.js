myfns.loadAndRecurse = function loadAndRecurse() {
	game = JSON.parse(fs.readFileSync(`./data/${gameName}.game.json`), 'utf-8')
	raw = JSON.parse(fs.readFileSync(`./data/${gameName}.raw.json`), 'utf-8')

	game.player = game.connected_players[0] = game.players[0]

	luaClassList = {}

	dig(game, (o, k, ok, path) => typeof(ok) == 'object' && ok && ok._values().length==0 && (o[k] = []))

	dig([game], (o,k,ok)=>{
		if (!ok || typeof (ok) != 'object')
			return;
		if (!ok._type || ok._type[0] == '^')
			return;
		if (!luaClassList[ok._type])
			luaClassList[ok._type] = eval(`(()=>{let c = class ${ok._type}{}; c.prototype._type = c.prototype.object_type = '${ok._type}'; return c})()`)
		ok.__proto__ = luaClassList[ok._type].prototype;
		ok.hasOwnProperty('_type') && delete ok._type;
		ok.hasOwnProperty('object_type') && delete ok.object_type;
	}
	)

	linkList = []

	dig(game, (o,k,ok)=>{
		if (typeof (o[k]) == 'object') {
			if (o[k]?._type && o[k]._type[0] == '^') {
				linkList.push({
					o,
					k,
					ok
				})
			}
		}
	}
	)

	linkList

	set = new Set(linkList.map(e=>e.o[e.k]._type.slice(1)))

	objList = Object.fromEntries([...set].map(e=>[e, {}]))

	dig(game, (o,k,ok,path)=>{
		if (ok && typeof ok == 'object' && objList[ok._type]) {
			let list = objList[ok._type][ok.name] || (objList[ok._type][ok.name] = [])
			list.push([ok, path.join('.')])
		}
	}
	)

	objList

	for (let i = 0; i < 3; i++)
		for (let {o, k, ok} of linkList) {
			if (ok._type[0] != '^')
				continue;
			let t = ok._type.slice(1);
			let list = objList[t][ok.name]?.map(e=>e[0]);
			let obj = list?.find(e=>{
				for (let k in ok)
					if (k[0] != '_')
						if (ok[k] != e[k])
							return false;
				return true;
			}
			)
			if (obj) {
				o[k] = obj;
			} else {
				i == 2 && console.log({
					t,
					o,
					k,
					ok,
					list,
					obj
				})
			}
		}

	game.fluid_prototypes._values().map(e=>e.type = 'fluid')
	game.virtual_signal_prototypes._values().map(e=>e.type = 'virtual_signal')
	game.recipe_prototypes._values().map(e=>e.type = 'recipe')

	log('%c Game and Raw are loaded, recursive links restored!', 'font-weight: bold;')
}
