myfns.LoadLuaTypes = async function LoadLuaTypes() {

	// fetch classes data
	// apiDataDoc = window.apiDataDoc || await fetch.doc('https://lua-api.factorio.com/latest/Classes.html');

	typeEls = apiDataDoc.qq('.type-name').map(e=>e.closest('.brief-listing'))

	LuaType = class LuaType {
	}

	types = {};

	for (let el of typeEls) {
		let name = el.q('.type-name').innerText;
		types[name] = new LuaType();
		types[name]._type = name;
	}

	for (let el of typeEls) {
		let name = el.q('.type-name').innerText;
		let extEl = el.q('.type-name').nextElementSibling;
		if (extEl.matches('.sort'))
			continue;
		let ext = extEl.innerText;
		types[name].__proto__ = types[ext];
		types[name]._proto = ext;
	}

	for (let el of typeEls) {
		let name = el.q('.type-name').innerText;
		let type = types[name];

		let memberEls = el.qq('.brief-members .header');
		for (let mel of memberEls) {
			if (mel.innerText.match(/[({})]/))
				continue;
			let mname = mel.q('a').innerText;
			if (mname.includes('[]'))
				continue;
			if (!mel.q('.param-type'))
				continue;
			//         console.log(mel)
			let value = mel.q('.param-type').innerText;
			let m;
			if (m = value.match(/^(?:CustomDictionary|dictionary) .* → (\w+)$/)) {
				value = m[1] + '{}';
			}
			if (m = value.match(/^(?:CustomArray|array) of (\w+)$/)) {
				value = m[1] + '[]';
			}
			if (value.includes(' ')) {
				if (value.match(/^[a-z →]*$/)) {
					value = 'any'
				} else {
					log('wrong value', {
						name,
						mname,
						value
					})
					continue;
				}
			}
			type[mname] = value;

		}
	}

	typeList = ()=>Object.values(types)

	for (let t of typeList()) {
		for (let k in t) {
			if (t[k] == 'ForceSpecification') {
				t[k] = '^LuaForce';
			}
		}
	}

	types.LuaGameScript.connected_players = '^' + types.LuaGameScript.connected_players;

	types.LuaGroup._req = {
		group: {
			prop: 'type',
			val: 'item-subgroup'
		},
		subgroups: {
			prop: 'type',
			val: 'item-group'
		},
		order_in_recipe: {
			prop: 'type',
			val: 'item-group'
		},
	}
	types.LuaEquipmentPrototype._req = {
		logistic_parameters: {
			prop: 'type',
			val: 'robotport-equipment'
		},
	}
	// types.LuaGameScript.item_subgroup_prototypes = 'LuaSubGroup{}';
	// types.LuaSubGroup = JSON.parse(JSON.stringify(types.LuaGroup));
	// delete types.LuaGroup.group;
	// delete types.LuaSubGroup.subgroups;

	for (let t of typeList()) {
		if (t._type == 'LuaGameScript')
			continue;
		for (let k in t) {
			if (k.startsWith('_'))
				continue;
			if (t._type == 'LuaForce' && (k == 'technologies' || k == 'recipes'))
				continue;
			if (t._type == 'LuaBurnerPrototype')
				continue;
			if (types[t[k].replace(/[{}[\]]+/, '')]) {
				t[k] = '^' + t[k]
			}
		}
	}

	for (let t of typeList()) {//     delete t._type
	}

	// for (let i = 0; i < 10; i++)
	//     for (let name in types) {
	// //         if (types[name]._proto)
	// //             Object.assign(types[name], Object.assign({}, types[name].__proto__, types[name]))
	//     }

	// types

	// reachable = {
	//     'LuaGameScript': true
	// };
	// types.LuaGameScript._reachable = true

	// for (let k of 'player players forces styles connected_players permissions pollution_statistics'.split(' ')) {
	//     delete types.LuaGameScript[k]
	// }

	// for (let i = 0; i < 20; i++) {
	//     for (let tname in reachable) {
	//         if (tname == 'LuaEntity')
	//             continue
	//         let type = types[tname];
	//         if (!type)
	//             continue;
	//         for (let member in type) {
	//             if (member.startsWith('_'))
	//                 continue;
	//             let vtype = type[member].match(/\[\]$|\{\}$/) ? type[member].slice(0, -2) : type[member];
	//             reachable[vtype] = true;
	//             if (types[vtype] && !types[vtype]._reachable)
	//                 types[vtype]._reachable = `${tname}.${member}`;
	//         }
	//     }
	// }
	// reachable

	fs.writeFileSync('./data/LuaAllTypes.json', JSON.stringify(types, 0, '\t'))
	fs.writeFileSync('./data/LuaAllTypes.lua', 'dataTypes = \n' + JSON.stringify(types, 0, '\t').replace(/("[^"]*"):/g, '[$1] ='))
	fs.writeFileSync('./game/mods/zzzDataRawSerpent_0.5.1/types.lua', 'dataTypes = \n' + JSON.stringify(types, 0, '\t').replace(/("[^"]*"):/g, '[$1] ='))

	// rtypes = Object.fromEntries(Object.entries(types).filter(([k,v])=>v._reachable).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([k,v])=>!k.startsWith('_')))]))

	// fs.writeFileSync('./data/LuaTypes.json', JSON.stringify(rtypes, 0, '\t'))

	// reachable2 = Object.fromEntries(Object.entries(reachable).filter(([k,v])=>!types[k]))

	// rtypes

	types

}

// TODO 
// game.connected_players should be link