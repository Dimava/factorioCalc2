myfns.renameModFolders = function renameModFolders() {

	fs.readdirSync('./mods').map(e=>{

		if (e.startsWith('__') || e.endsWith('.zip'))
			return;

		let j = fs.json(`./mods/${e}/info.json`)

		fs.rename(`./mods/${e}`, `./mods/__${j.name}__`, ()=>{}
		)

	}
	)

}
