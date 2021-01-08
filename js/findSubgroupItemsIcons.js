myfns.findSubgroupItemsIcons = function findSubgroupItemsIcons() {

	let a = Object.values(game).flatMap(e=>Object.values(e)).filter(e=>typeof e == 'object' && e.subgroup)

function parseIconSource(rawIcon) {
	if (!rawIcon) return null;
	let clone = ({icon, icon_size, icon_mipmaps, mipmap_count, scale, shift, tint}, size) => ({icon, icon_size: icon_size || size, icon_mipmaps, mipmap_count, scale, shift, tint});
	let icons;
	if (rawIcon.icons) {
		icons = rawIcon.icons.map(e=>clone(e, rawIcon.icon_size))
	} else if (rawIcon.icon) {
		icons = [clone(rawIcon)]
	} else {
		return null
	}
	return {
		icons,
		hash: JSON.stringify(icons).hashCode(),
		names: [],
	}
}


	for (let  i = 0; i < 3; i++)
	for (let it of a) {
// 		if (it._icon)
// 			continue;
		
		const types = {
			LuaRecipePrototype: 'recipe',
			LuaFluidPrototype: 'fluid',
			LuaVirtualSignalPrototype: 'virtual-signal',
		}

		let icon = parseIconSource(raw[it.type || types[it._type]]?.[it.name]);
		if (icon) {
			it._icon = icon;
			icon.names.push(`${it.type || types[it._type]}.${it.name}`);
			continue;
		}

		if (it._type == 'LuaRecipePrototype') {
			if (it.main_product || it.products.length == 1) {
				let p = it.main_product || it.products[0];
				let item = game[p.type + '_prototypes'][p.name];
				if (item._icon) {
					it._icon = item._icon;
					item._icon.names.push(`${it.type || types[it._type]}.${it.name}`);
				}
			}
		}

	}

	log({entriesWithoutIcon: a.filter(e=>!e._icon)})

	entriesWithIcon = a.filter(e=>e._icon);

	for (let it of Object.values(game.technology_prototypes)) {
		let icon = parseIconSource(raw.technology[it.name]);
		if (icon) {
			it._icon = icon;
			icon.names.push(`${it.type}.${it.name}`);
			continue;
		}
	}
	for (let it of Object.values(game.item_group_prototypes)) {
		let icon = parseIconSource(raw[it.type][it.name]);
		if (icon) {
			it._icon = icon;
			icon.names.push(`${it.type}.${it.name}`);
			continue;
		}
	}
	for (let it of game._values().flatMap(e=>e._values())) {
		if (!it || typeof it != 'object' || it._icon) continue;
		let icon = parseIconSource(raw[it.type]?.[it.name]);
		if (icon) {
			it._icon = icon;
			icon.names.push(`${it.type}.${it.name}`);
			continue;
		}
	}

	log({entriesWithIcon, techs: game.technology_prototypes, groups: game.item_group_prototypes})
}

