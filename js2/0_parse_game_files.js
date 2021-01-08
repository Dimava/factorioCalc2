
globalThis.gameName = 'test';


function copy_game_json(gameName = 'test') {

	function luaToJson(s) {
		s = s.replace(/(^\s*)([\w-]+)( = )/gm, '$1"$2": ')
		s = s.replace(/(^\s*)\["((?:[^"]+)*)"\]( = )/gm, '$1"$2": ')
		return JSON.parse(s, function(key, value) {
			return value._isArray ? Array.from(value) : value;
		});
	}

	let s = '';

	s = fs.readFileSync('./game/factorio-current.log', 'utf-8')
	s = s.match(/\n\n\n[^]*?\n\n\n/)[0]

	let raw = luaToJson(s)
	fs.json(`./data/${gameName}.raw.json`, raw)

	s = fs.readFileSync('./game/script-output/game.lua', 'utf-8')

	let game = luaToJson(s)
	fs.json(`./data/${gameName}.game.json`, game)

	return {raw, game};


	// err = 0;
	// try {
	// 	o = JSON.parse(s,function(key, value){
	// 		if (!value._isArray) return value;
	// 		return Array.from(value)
	// 	})
	// } catch (e) {
	// 	err = e
	// 	console.error(e)
	// }
	// if (err) {
	// 	n = err.message.match(/position (\d+)/)[1]
	// 	d = s.slice(Math.max(0, +n - 100), +n + 100)
	// 	console.log(d.replace(/\n/g, '↵'))
	// 	console.log(' '.repeat(Math.min(n, 100)) + '^')
	// 	log(d)
	// 	log(luaToJson(d))
	// }

}


Object.assign(globalThis, {
	copy_game_json,
});
