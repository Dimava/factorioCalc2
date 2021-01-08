
function loadImg(link) {
	if (loadImg[link]) return loadImg[link]
	let img = new Image();
	let p = Promise.empty()
	img.onload = () => p.r(loadImg[link] = img);
	img.onerror = () => p.r(loadImg[link] = img);
	img.src = './mods/' + link
	return p.p;
}

async function drawIconSource(iconSource, base_size, ctx) {
	function tintImage(img, {r, g, b, a=1}) {
		let color = `rgba(${r * 255},${g * 255},${b * 255},${a * 255})`;

		let cv = elm('canvas');
		cv.height = img.naturalHeight;
		cv.width = img.naturalWidth;

		let ctx = cv.getContext('2d');
		ctx.fillStyle = color
		ctx.fillRect(0, 0, img.naturalWidth, img.naturalHeight)

		ctx.globalCompositeOperation = 'destination-atop'
		ctx.drawImage(img, 0, 0)

		ctx.globalAlpha = a
		ctx.globalCompositeOperation = 'multiply';
		ctx.drawImage(img, 0, 0)

		return cv;
	}
	async function drawIcon({icon, icon_size, icon_mipmaps, mipmap_count, scale = 1, shift, tint}, base_size) {
		let img = await loadImg(icon);
		if (!img.naturalWidth) {
			console.warn('image not loaded', img);
			return;
		}
		if (img.naturalHeight != icon_size) {
			console.warn('image has bad size')
			scale /= (img.naturalHeight / icon_size)
			icon_size = img.naturalHeight
		}
		if (tint) {
			img = tintImage(img, tint);
		}
		let sx = 0
		  , sy = 0
		  , sw = icon_size
		  , sh = icon_size;
		let x = 0
		  , y = 0
		  , w = icon_size
		  , h = icon_size;
		while (icon_mipmaps >= 1 && base_size <= icon_size / 2) {
			sx += icon_size
			w = h = sw = sh = icon_size /= 2
			icon_mipmaps--;
			if (scale) scale *= 2;
		}
		if (scale) {
			w *= scale;
			h *= scale;
		}
		if (shift) {
			x += base_size / 2
			y += base_size / 2
			x -= w / 2
			y -= h / 2
			x += shift[0];
			y += shift[1];
		}
		ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
// 		ctx.strokeRect(x, y, w, h) // test
// 		log({icon, icon_size, icon_mipmaps, mipmap_count, scale, shift, tint})
// 		log(img, sx, sy, sw, sh, x, y, w, h)
	}
	for (let icon of iconSource.icons) {
		await drawIcon(icon, base_size)
	}
}


async function generateIconList(iconlist, size, fname) {
	if (!iconlist[0]) {
		iconlist = Object.values(iconlist);
	}
	if (iconlist[0]._icon) {
		iconlist = iconlist.map(e=>e._icon);
	}
	iconlist = iconlist._unique('hash');

	let imax = Math.ceil(iconlist.length ** 0.5);

	if (!window.cv) {
		cv = elm('canvas#cv').appendTo('body');
		cv.style.border = '1px solid #eee';
		cv.style.margin = '10px'
	}

	cv.width = cv.height = imax * size;
	let ctx = cv.getContext('2d');
	ctx.clearRect(0, 0, imax * size, imax * size);

	let json = {};


	let i = 0, j = 0, k = 0;
	for (let icon of iconlist) {

		icon.size = size;
		icon.x = i * size;
		icon.y = j * size;
		icon.src = fname;
		json[icon.hash] = icon;


		ctx.save();
		ctx.translate(i * size, j * size);

// 		ctx.strokeRect(0, 0, size, size)
		ctx.beginPath()
		ctx.moveTo(0,0)
		ctx.lineTo(0, size);
		ctx.lineTo(size, size);
		ctx.lineTo(size, 0);
		ctx.clip();

		let actualSize = Math.max(...icon.icons.map(e=>e.icon_size*(e.scale || 1))) / size
		ctx.scale(1/actualSize, 1/actualSize)

// 		if (k==762)
		await drawIconSource(icon, size * actualSize, ctx);
		ctx.scale(actualSize, actualSize)
// 		ctx.fillText(k, 2, 10)

		ctx.restore();

		k++;
		i++;
		if (i == imax) {
			i = 0;
			j++;
		}
	}

	cv.save(`./data/${gameName}.${fname}.png`)
	fs.json(`./data/${gameName}.${fname}.json`, json)
}

