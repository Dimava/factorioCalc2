import "./1_load_raw_game.js";

let shouldWarn = false;

class IconLayer {
	/**
	 @param {Object} layer
	 @param {string} layer.icon
	 @param {number} layer.icon_size
	 @param {number} [layer.icon_mipmaps]
	 @param {string} [layer.scale]
	 @param {[number, number]} [layer.shift]
	 @param {{r:number,g:number,b:number,a:number}} [layer.tint]
	 @param {number} [fallback_size]
	 */
	constructor({ icon, icon_size, icon_mipmaps, scale = 1, shift, tint }, fallback_size) {
		if (typeof (icon) == 'object') {
			icon_size = icon.size;
			icon_mipmaps = icon.mipmap_count;
			icon = icon.filename;
		}
		this.icon = icon;
		this.icon_size = icon_size || fallback_size;
		if (!this.icon_size) debugger;
		this.icon_mipmaps = icon_mipmaps;
		this.scale = scale;
		this.shift = shift;
		this.tint = tint;
		// filename: "__base__/graphics/icons/shortcut-toolbar/mip/alt-mode-x32.png"
		// flags: ["gui-icon"]
		// mipmap_count: 2
		// priority: "extra-high-no-scale"
		// scale: 0.5
		// size: 32
	}

	static async unzipImage(src) {
		if (fs.existsSync(`${IconLayer.iconRawPath}${src}`)) {
			return true;
		}
		if (!this.AdmZip) {
			this.AdmZip = require('adm-zip');
		}
		let modName = src.split('/')[0].slice(2, -2);

		if (!this.AdmZip[modName]) {
			let alikeMods = fs.readdirSync(IconLayer.gameModsRawPath)
				.filter(e => e.startsWith(modName) && e.endsWith('zip'));
			if (alikeMods.length != 1) throw alikeMods;
			try {
				this.AdmZip[modName] = new this.AdmZip(IconLayer.gameModsRawPath + alikeMods[0]);
			} catch (err) { debugger }
		}

		let fname = src.replace(/[^/]+/, '');
		let zip = this.AdmZip[modName];
		let zipEntries = zip.getEntries().filter(e => e.entryName.replace(/[^/]+/, '') == fname);
		if (zipEntries.length != 1) throw zipEntries;
		try {
			zip.extractEntryTo(zipEntries[0], IconLayer.iconRawPath, false, true, src);
		} catch (err) { debugger }
		log('extracted image:', src);
	}

	static async loadImage(src) {
		if (typeof src != 'string') {
			if (src.filename) {
				src = src.filename;
			} else {
				throw ['bad image', src];
			}
		}
		await this.unzipImage(src);
		if (IconLayer.images.has(src)) {
			return IconLayer.images.get(src);
		}
		let img = new Image();
		let p = Promise.empty();
		img.onload = () => {
			// log('image loaded:', src)
			IconLayer.images.set(src, img);
			p.r(img);
		};
		img.onerror = () => {
			console.warn('image failed:', src)
			img = IconLayer.loadImage(IconLayer.fallbackImage);
			IconLayer.images.set(src, img);
			IconLayer.unzipImage(src)
			// 			p.r(img);
		}
		IconLayer.images.set(src, p.p);
		img.src = `${IconLayer.iconRawPath}${src}`;
		return p.p;
	}

	static tintImage(img, { r, g, b, a = 1 }) {
		let color = `rgba(${r * 255},${g * 255},${b * 255},${a * 255})`;

		let cv = elm('canvas');
		cv.height = img.naturalHeight ?? img.height;
		cv.width = img.naturalWidth ?? img.width;

		let ctx = cv.getContext('2d');
		ctx.fillStyle = color;
		ctx.fillRect(0, 0, cv.height, cv.width);

		ctx.globalCompositeOperation = 'destination-atop'
		ctx.drawImage(img, 0, 0)

		ctx.globalAlpha = a;
		ctx.globalCompositeOperation = 'multiply';
		ctx.drawImage(img, 0, 0);

		return cv;
	}

	static trimMipmap(img, icon_size) {
		let cv = elm('canvas');
		cv.height = icon_size;
		cv.width = icon_size;
		let ctx = cv.getContext('2d');
		ctx.drawImage(img, 0, 0);
		return cv;
	}

	static pica() {
		if (this.pica._value) return this.pica._value;
		return this.pica._value = require('pica')({ features: ['js', 'wasm'] });
	}

	static async resizeImage(img, target_size) {
		let cv = elm('canvas');
		cv.width = cv.height = target_size;
		let pica = this.pica();
		return pica.resize(img, cv, {
			quality: 3,
			alpha: true,
			// unsharpAmount: 80,
			// unsharpRadius: 0.6,
			// unsharpThreshold: 2,
		});
		try {
			return await p;
		} catch (e) {
			debugger;
			return img;
		}
	}

	static scaledImage(id, val) {
		if (!this.scaledImages) this.scaledImages = new Map();
		if (val) {
			this.scaledImages.set(id, val);
		}
		if (this.scaledImages.has(id)) {
			return this.scaledImages.get(id);
		}
		return false;
	}

	async draw(ctx, base_size, original_size, source_size) {

		let target_size = Math.min(this.scaledSize(), original_size)
			* (base_size / original_size)
			* (original_size / source_size);
		target_size = Math.round(target_size);

		let shift_scale = 1
			* (base_size / original_size)
			* (original_size / source_size);

		// let target_size = Math.round(this.targetSize(original_size) * base_size / original_size * scale_fix);
		let id = [this.icon, this.icon_mipmaps, target_size].join(':');
		let img = await IconLayer.scaledImage(id);
		if (!img) {
			let p = Promise.empty();
			IconLayer.scaledImage(id, p.p);

			img = await IconLayer.loadImage(this.icon);
			if (!img.naturalWidth) {
				console.warn('image not loaded', img);
				throw ['image not loaded', img, this];
			}
			if (this.icon_mipmaps) {
				img = IconLayer.trimMipmap(img, this.icon_size);
			}
			if (img.naturalHeight != img.naturalWidth) {
				img = IconLayer.trimMipmap(img, img.naturalHeight);
			}
			if ((img.naturalHeight ?? img.height) != this.icon_size) {
				console.warn('image has bad size', img.naturalHeight ?? img.height, this.icon_size, this.icon);
				// this.icon_size = img.naturalHeight ?? img.width;
				// img = IconLayer.trimMipmap(img, this.icon_size);
			}
			if (this.icon_size != target_size) {
				img = await IconLayer.resizeImage(img, target_size);
			}
			IconLayer.scaledImage(id, img);
			p.r(img);
		}

		if (this.tint) {
			img = IconLayer.tintImage(img, this.tint);
		}

		let center = Math.round((base_size - target_size) / 2);
		let shift = this.shift || [0, 0];

		// 		log({ this: this, base_size, original_size, source_size, target_size, shift_scale, shift: JSON.stringify(shift) })

		ctx.drawImage(img, Math.round(center + shift[0] * shift_scale), Math.round(center + shift[1] * shift_scale));

	}

	targetSize(original) {
		return Math.min(this.scale * this.icon_size, original);
	}

	scaledSize() {
		return this.scale * this.icon_size;
	}
}

/** @type {Map.<string, HTMLImageElement>} */
IconLayer.images = new Map();

IconLayer.fallbackImage = '__core__/graphics/icons/unknown.png'; //raw.item['item-unknown'].icon;

IconLayer.iconRawPath = './mods/';
IconLayer.gameModsRawPath = './game/mods/';

class IconSource {
	/**
	 @param {Object} rawIcon
	 @param {any[]} [rawIcon.icon]
	 @param {number} [rawIcon.icon_size]
	 @param {number} size
	 */
	constructor(rawIcon, size = 32) {
		if (rawIcon.icons) {
			/** @type {IconLayer[]} */
			this.icons = rawIcon.icons.map(e => new IconLayer(e, rawIcon.icon_size));
		} else {
			this.icons = [new IconLayer(rawIcon, rawIcon.icon_size)];
		}

		/** @type {string} */
		this.hash = JSON.stringify(this.icons).hashCode();

		/** @type {string[]} */
		this.names = [];

		this.icon_size = size;

		// this.enabled = false;
	}

	static isRawIcon(rawIcon) {
		return !!(rawIcon.icon || rawIcon.icons);
	}

	static fromRaw(rawIcon, name) {
		if (typeof (name) == 'object') {
			name = `${name.type}.${name.name}`;
		}
		if (!IconSource.isRawIcon(rawIcon)) return null;
		let type = name.split('.')[0];
		let size = type == 'technology' ? 256 : type == 'item-group' ? 128 : 32;
		let icon = new IconSource(rawIcon, size);
		if (IconSource.iconByHash.has(icon.hash)) {
			icon = IconSource.iconByHash.get(icon.hash);
		} else {
			IconSource.iconByHash.set(icon.hash, icon);
		}
		if (!icon.names.includes(name)) {
			if (IconSource.iconByName.has(name)) {
				if (IconSource.iconByName.get(name) != icon) {
					throw ['dupe icon', name, rawIcon];
				}
			}
			icon.names.push(name);
			IconSource.iconByName.set(name, icon);
		}
		return icon;
	}

	/**
	 @param {string} name
	 */
	static getByName(name) {
		return IconSource.iconByName.get(name);
	}
	/**
	 @param {number} hash
	 */
	static getByHash(hash) {
		return IconSource.iconByHash.get(hash);
	}
	/**
	 @param {number} hash
	 */
	static getByItem({ type, name }) {
		return IconSource.iconByName.get(`${type}.${name}`);
	}

	async draw(ctx, base_size) {
		for (let layer of this.icons) {
			IconLayer.loadImage(layer.icon);
		}
		let source_size = Math.max(
			...this.icons.map(e => Math.min(this.icon_size, e.scaledSize()))
		);
		for (let layer of this.icons) {
			await layer.draw(ctx, base_size, this.icon_size, source_size);
		}
	}
}

IconSource.path = './images/';

/** @type {Map.<string, IconSource>} */
IconSource.iconByName = new Map();
/** @type {Map.<number, IconSource>} */
IconSource.iconByHash = new Map();
/** @type {IconSource} */
IconSource.unknown = null;

async function make_icons() {
	console.time('make_icons');

	IconLayer.fallbackImage = raw.item['item-unknown'].icon;

	let allRawEntries = Object.values(raw).filter(e => typeof e == 'object')
		.flatMap(Object.values).filter(e => e.icon || e.icons);

	for (let entry of allRawEntries) {
		if (!entry.type || !entry.name) {
			console.warn('missing type', entry);
		}
		IconSource.fromRaw(entry, `${entry.type}.${entry.name}`);
	}

	let unknown = IconSource.getByName('item.item-unknown');
	IconSource.unknown = unknown;
	IconSource.fromRaw(unknown, 'unknown');
	IconSource.fromRaw({
		icons: IconSource.getByName('explosion.explosion').icons.concat(unknown.icons),
	}, 'explosion.unknown');
	// IconSource.fromRaw({
	// 	icons: IconSource.fromRaw(game.item_prototypes["artillery-shell"], 'item.artillery-shell').icons.concat(unknown.icons),
	// }, 'projectile.unknown');

	log({ allRawEntries });

	for (let entry of Object.values(game.item_prototypes)) {
		let icon = IconSource.getByName(`${entry.type}.${entry.name}`);
		IconSource.fromRaw(icon, `item.${entry.name}`);
		IconSource.fromRaw(icon, `${entry.name}`);
	}
	for (let entry of Object.values(game.fluid_prototypes)) {
		let icon = IconSource.getByName(`${entry.type}.${entry.name}`);
		IconSource.fromRaw(icon, `item.${entry.name}`);
		IconSource.fromRaw(icon, `${entry.name}`);
	}

	let allSubGroupedEntries = Object.values(game).filter(e => typeof e == 'object')
		.flatMap(Object.values).filter(e => e?.subgroup);

	for (let entry of allSubGroupedEntries) {
		if (!entry.type || !entry.name) {
			throw ['missing type', entry];
		}
		let icon = IconSource.getByName(`${entry.type}.${entry.name}`);

		if (!icon && entry.type == 'recipe' && entry.main_product) {
			icon = IconSource.getByName(`${entry.main_product.type}.${entry.main_product.name}`);
		}

		if (!icon && IconSource.getByName(`${entry.type}.unknown`)) {
			icon = IconSource.getByName(`${entry.type}.unknown`);
		}

		if (!icon) {
			shouldWarn && console.warn('missing icon', entry);
			icon = unknown;
		}
		entry._icon = IconSource.fromRaw(icon, entry);
	}

	log({ allSubGroupedEntries });

	let pumpRecipeEntries = Object.values(raw.recipe).filter(e => e.name.startsWith('pumping--'));

	for (let entry of pumpRecipeEntries) {
		let pump = game.entity_prototypes[entry.category];
		let pumpIcon = pump._icon //IconSource.getByItem(pump);
		let fluidIcon = pump.fluid._icon //IconSource.getByItem(pump.fluid);
		pumpIcon.icons.map(e => assert(e => !e.shift, 'non-impl'));
		let base_size = Math.max(...[fluidIcon.icons, pumpIcon.icons].flat().map(e => e.scale * e.icon_size));
		base_size = 32;
		entry._icon = IconSource.fromRaw({
			icons: [
				...fluidIcon.icons,
				...pumpIcon.icons.map(layer => ({
					...layer,
					scale: layer.scale / 2 * (base_size / Math.max(pumpIcon.icon_size, ...pumpIcon.icons.map(e => e.scaledSize()))),
					shift: [-base_size / 4, base_size / 4],
				})),
			],
		}, entry);
		// log(base_size, entry._icon.icons);
	}

	log({ pumpRecipeEntries });

	if (globalThis.nw) {
		if (fs.existsSync(`${IconSource.path}iconData.json`)) {
			let iconData = fs.json(`${IconSource.path}iconData.json`);
			let filesExist = new Map();
			for (let data of Object.values(iconData)) {
				let icon = IconSource.getByHash(data.hash);
				if (!icon) continue;
				for (let [k, v] of Object.entries(data)) {
					if (!+k) continue;
					if (!filesExist.has(v.src)) {
						filesExist.set(v.src, fs.existsSync(`${IconSource.path}${v.src}`));
					}
					if (!filesExist.get(v.src)) continue;
					icon[+k] = data[k];
				}
			}
		}
	} else {
		// await fetch.cached(`${IconSource.path}iconData.json`);
		let iconData = await fs.load_json(`${IconSource.path}iconData.json`);
		for (let data of Object.values(iconData)) {
			let icon = IconSource.getByHash(data.hash);
			if (!icon) continue;
			for (let [k, v] of Object.entries(data)) {
				if (!+k) continue;
				icon[+k] = data[k];
			}
		}
	}


	console.timeEnd('make_icons');
	log('%c Game and Raw icons are parsed and loaded!', 'font-weight: bold;')
}

/**
 @param {IconSource[]} iconlist
 @paran {number} base_size
 */
async function paint_iconlist(iconlist, base_size, src = 'test') {
	iconlist = iconlist.filter(e => src == 'test' || !e[base_size]);
	if (!iconlist.length) return;

	iconlist.sort((a, b) => a.names[0] > b.names[0] ? 1 : -1);

	if (src != 'test' && fs.existsSync(src)) {
		let i = 1;
		while (fs.existsSync(src.replace(/(?=\.[^.]*$)/, '.' + i))) i++;
		src = src.replace(/(?=\.[^.]*$)/, '.' + i);
	}
	log('%c Drawing %o items in %ox%o into ', 'font-weight: bold;', iconlist.length, base_size, base_size, src);

	console.time('paint_iconlist_' + src);

	let imax = Math.ceil(iconlist.length ** 0.5);

	let cv = elm('canvas#cv').appendTo('body');
	cv.style.border = '1px solid #eee';
	cv.style.margin = '10px';

	cv.width = cv.height = imax * base_size;
	let ctx = cv.getContext('2d');
	ctx.clearRect(0, 0, imax * base_size, imax * base_size);

	let i = 0,
		j = 0,
		k = 0;
	for (let icon of iconlist) {
		if (src != 'test') {
			icon[base_size] = {
				size: base_size,
				x: i * base_size,
				y: j * base_size,
				src: src,
			}
		}

		ctx.save();
		ctx.translate(i * base_size, j * base_size);

		// ctx.strokeRect(0, 0, size, size)
		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(0, base_size);
		ctx.lineTo(base_size, base_size);
		ctx.lineTo(base_size, 0);
		ctx.clip();

		// ctx.scale(1 / actualSize, 1 / actualSize)

		// if (k==762)
		await icon.draw(ctx, base_size);
		// ctx.scale(actualSize, actualSize)
		// ctx.fillText(k, 2, 10)

		ctx.restore();

		k++;
		i++;
		if (i == imax) {
			i = 0;
			j++;
		}
		for (let l = 0; l < 20; l++) {
			if (!iconlist[k + l]) break;
			for (let layer of iconlist[k + l].icons) {
				IconLayer.loadImage(layer.icon);
			}
		}
		if (k % 10 == 0) {
			await Promise.frame();
		}
	}
	if (src != 'test') {
		cv.save(`${IconSource.path}${src}`);
		let fullList = [...IconSource.iconByHash.values()];
		let json = Object.assign(fs.json(`${IconSource.path}iconData.json`) ?? {},
			Object.fromEntries(fullList.map(e => [e.hash, e]))
		)
		fs.json(`${IconSource.path}iconData.json`, json);
	}


	console.timeEnd('paint_iconlist_' + src);
}



async function paint_icons() {
	let fullList = [...IconSource.iconByHash.values()];
	let groupList = fullList.filter(e => e.names.find(n => n.startsWith('item-group.')));
	let techList = fullList.filter(e => e.names.find(n => n.startsWith('technology.')));

	let lists = [
		{ list: fullList, size: 32, file: `${gameName}.icon.png` },
		{ list: fullList, size: 16, file: `${gameName}.icon-16.png` },
		{ list: groupList, size: 64, file: `${gameName}.group.png` },
		{ list: techList, size: 64, file: `${gameName}.tech.png` },
	]
	await lists.pmap(({ list, size, file }) => paint_iconlist(list, size, file));

}

paint_icons.clear = function() {
	fs.readdirSync(IconSource.path)
		.filter(e => e.startsWith(gameName + '.'))
		.map(e => fs.unlinkSync(IconSource.path + e));
	localStorage.tmpGameName = 'vanilla';
	location.reload();
}


Object.assign(globalThis, {
	IconLayer,
	IconSource,
	make_icons,
	paint_iconlist,
	paint_icons,
});