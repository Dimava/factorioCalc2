myfns.copyGameJson = function copy_game_json() {
	if (!window.gameName) {
		throw 'requires game name!';
	}
	let s;
// 	gameName = 'seablock'
	// gameName = 'space'
	// gameName = 'vanilla'

	s = fs.readFileSync('./game/factorio-current.log', 'utf-8')
	// s = fs.readFileSync('./game/factorio-previous.log', 'utf-8')
	s = s.match(/\{\n[^]*\n\}/)[0]
	s = s.replace(/: (-?inf)/g, ': "$1"')
	s = s.replace(/: nan/g, ': null')
	s = s.replace(/: USERDATA/g, ': "USERDATA"')
	fs.writeFileSync(`./data/${gameName}.raw.json`, JSON.stringify(JSON.parse(s)))
	console.log({[`${gameName}.raw.json`]:s.length})

	s = fs.readFileSync('./game/script-output/game.json', 'utf-8')
	s = s.replace(/: (-?inf)/g, ': "$1"')
	s = s.replace(/: nan/g, ': null')
	s = s.replace(/: USERDATA/g, ': "USERDATA"')
	fs.writeFileSync(`./data/${gameName}.game.json`, JSON.stringify(JSON.parse(s)))
	console.log({[`${gameName}.game.json`]:s.length})

	s = ''

}