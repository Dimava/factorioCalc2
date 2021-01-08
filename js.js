window.__init__fn = function(window) {
	const {
		Object,
		Array,
		Promise,
		fetch,
		Window,
		Document,
		HTMLElement,
	} = window

	////////////////////
	//     Object     //
	////////////////////
	defineValue(Object, defineGetter)
	defineValue(Object, defineValue)

	function defineGetter(o, name, get = name, enumerable = false) {
		if (typeof name == 'function')
			name = name.name
		return Object.defineProperty(o, name, {
			enumerable,
			configurable: true,
			get
		})
	}

	function defineValue(o, name, value = name, enumerable = false) {
		if (typeof name == 'function')
			name = name.name
		return Object.defineProperty(o, name, {
			enumerable,
			configurable: true,
			writable: true,
			value
		})
	}

	////////////////////
	//      Array     //
	////////////////////
	defineValue(Array.prototype, pmap)
	defineValue(Array.prototype, unique)
	defineValue(Array.prototype, msort)
	defineValue(Array.prototype, munique)

	async function pmap(fn, threads = 5) {
		let result = Array(this.length)
		if (!((threads = +threads) > 0))
			threads = 1e6
		let activeThreads = 0

		let any = Promise.empty()
		for (let i = 0; i < this.length; i++) {
			activeThreads++
			Promise.resolve(fn(this[i], i, this)).then(v => result[i] = v).catch(e => result[i] = e).then(() => any.r(activeThreads--))
			if (activeThreads >= threads) {
				await any.p
				any = Promise.empty()
			}
		}
		while (activeThreads) {
			await any.p
			any = Promise.empty()
		}
		return result
	}

	function unique() {
		return Array.from(new Set(this))
	}

	function msort(mapper, sorter, neg) {
		let fn;
		if (typeof sorter != 'function') {
			neg = sorter
			if (neg) {
				fn = (a, b) => a[0] > b[0] ? -1 : a[0] < b[0] ? 1 : 0
			} else {
				fn = (a, b) => a[0] > b[0] ? 1 : a[0] < b[0] ? -1 : 0
			}
		} else {
			if (neg) {
				fn = (a, b) => sorter(b[0], a[0])
			} else {
				fn = (a, b) => sorter(a[0], b[0])
			}
		}
		return this.map(e => [mapper(e), e]).sort(fn).map(e => e[1])
	}

	function munique(mapper, neg) {
		let values = this.map(mapper)
		let unique = new Set(values)
		if (neg) return this.filter((e, i) => !unique.delete(values[i]))
		return this.filter((e, i) => unique.delete(values[i]))
	}



	////////////////////
	//     Promise    //
	////////////////////
	defineValue(Promise, 'empty',
		(r, j, p) => (p = new Promise((res, rej) => (r = res, j = rej)), { r, j, p })
	)
	defineValue(Promise, 'wait',
		(t = 10) => new Promise(r => setTimeout(r, t))
	)
	defineValue(Promise, 'frame',
		(n = 0) => +n ? Promise.resolve().frame(n) : new Promise(r => requestAnimationFrame(r))
	)
	Object.defineValue(Promise.prototype, async function wait(t = 10) {
		let val = await this
		await Promise.wait(t)
		return val
	})
	Object.defineValue(Promise.prototype, async function frame(n) {
		let val = await this
		await new Promise(r => requestAnimationFrame(r))
		if (typeof n == 'number') {
			for (n--; n > 0; n--)
				await new Promise(r => requestAnimationFrame(r))
		}
		return val
	})

	////////////////////
	//   fetch / elm  //
	////////////////////

	Object.defineValue(fetch, async function doc(url) {
		window.console.log('fetching document: %s', url)
		let xhr = new XMLHttpRequest()
		let p = Promise.empty()
		xhr.onload = p.r
		xhr.open("GET", url)
		xhr.responseType = "document"
		xhr.send()
		await p.p
		let document = xhr.responseXML
		document.redirected = xhr.redirected
		document.base = xhr.redirected ? null : url
		document.url = function(a) {
			if (typeof a == 'function')
				a = a()
			if (typeof a == 'object') {
				if (a.href)
					a = a.getAttribute('href')
				else if (a.src)
					a = a.getAttribute('src')
			}
			if (typeof a == 'string') {
				return new URL(a, document.base).href
			}
			throw todo()
		}
		return document
	})

	Object.defineValue(fetch, async function jsonAs(name, url) {
		let r = await fetch(url, { credentials: 'include' })
		let j = await r.json()
		return window[name] = j
	})


	Object.defineValue(fetch, async function cached(url, options = {}) {
		if (!fetch.useCache || !window.caches)
			return fetch(url, {
				credentials: 'include',
			});
		let cache = await caches.open('fetch')

		let response = await cache.match(url)

		if (response) {
			return response
		}
		options.credentials = options.credentials || 'include'
		response = await fetch(url, options)

		if (!response.ok) {
			throw new TypeError('bad response status')
		}
		await cache.put(url, response)
		return cached(url)
	})

	Object.defineValue(fetch, async function clearCache() {
		let r = await caches.delete('fetch');
		console.log('Fetch cache deleted!');
		return r;
	})


	window.elm = elm

	function elm(sel = '', ...children) {
		let tag = 'div',
			cls = [],
			id = '',
			attrs = [];
		sel = sel.replace(/^[\w\-]+/, (s => (tag = s,
			'')))

		sel = sel.replace(/\[(.*?)=(".*?"|'.*?'|.*?)\]/g, (s, attr, val) => (attrs.push({
			attr,
			val
		}),
			''))

		sel = sel.replace(/\.([\w\-]+)/g, (s, cl) => (cls.push(cl),
			''))

		sel = sel.replace(/\#([\w\-]+)/g, (s, d) => (id = id || d,
			''))

		if (sel != '')
			alert('sel is not empty!\n' + sel)

		let e = document.createElement(tag)

		if (id)
			e.id = id

		if (cls.length)
			e.className = cls.join(' ')

		attrs.forEach(({ attr, val }) => {
			e.setAttribute(attr, val)
		})

		if (children.length) {
			e.append(...children.filter(e => typeof e != 'function'))
			for (let fn of children.filter(e => typeof e == 'function')) {
				let fname = fn.name || (fn + '').match(/\w+/)[0]
				fname = fname.startsWith('on') ? fname : 'on' + fname
				e[fname] = fn
			}
		}

		return e
	}
	window.log = window.console.log.bind(window.console)

	////////////////////
	//   HTMLElement  //
	////////////////////

	function q(s, el = this) {
		return el.querySelector(s)
	}

	function qq(s, el = this) {
		return [...el.querySelectorAll(s)]
	}

	Object.defineValue(Document.prototype, q)
	Object.defineValue(Document.prototype, qq)

	Object.defineValue(HTMLElement.prototype, q)
	Object.defineValue(HTMLElement.prototype, qq)
	Object.defineValue(HTMLElement.prototype, function appendTo(e) {
		if (typeof e == 'string')
			e = window.document.q(e)
		e.append(this)
		return this
	})

	Object.defineValue(Window.prototype, 'q', function winq(...a) {
		return (this || window).document.q(...a)
	})
	Object.defineValue(Window.prototype, 'qq', function winqq(...a) {
		return (this || window).document.qq(...a)
	})

	////////////////////
	//      nwjs      //
	////////////////////

	let __nwjs = typeof window.process != 'undefined' && window.process.__nwjs
	if (__nwjs) {

		let fs = window.fs = require('fs')

		fs.ensureSync = function ensureDirectoryExistence(file) {
			let dir = file.split('/').slice(0, -1).join('/')
			if (fs.existsSync(dir))
				return
			fs.ensureSync(dir)
			fs.mkdirSync(dir)
		}

		fs.copySync = function copySync(file, to) {
			let stat = fs.lstatSync(file)
			if (stat.isDirectory()) {
				if (!file.endsWith('/'))
					file += '/'
				if (!to.endsWith('/'))
					to += '/'
				if (!fs.existsSync(to))
					fs.mkdirSync(to)
				for (let fname of fs.readdirSync(file)) {
					copySync(file + fname, to + fname)
				}
			}
			if (stat.isFile()) {
				fs.copyFileSync(file, to)
			}
		}

		fs.rmdirAll = function(folder) {
			if (!fs.existsSync(folder))
				return
			for (let file of fs.readdirSync(folder)) {
				let path = folder + '/' + path
				if (fs.lstatSync(path).isDirectory())
					fs.rmdirAll(path)
				else
					fs.unlinkSync(path)
			}
			fs.rmdirSync(folder)
		}

		fs.json = function(p, o) {
			let exists = fs.existsSync(p);
			if (o) {
				fs.writeFileSync(p, JSON.stringify(o));
				return !exists;
			} else {
				return !exists ? undefined : JSON.parse(fs.readFileSync(p, 'utf-8'))
			}
		}

		fs.load_json = function(p) {
			return fs.json(p);
		}

		window.setProgress = function(i = -1, a = []) {
			let p = w.q('progress') || elm('progress').appendTo('body')
			p.max = a.length
			p.value = i + 1
			let s = w.q('span#progressText') || elm('span#progressText').appendTo('body')
			s.innerText = ` ${i + 1} / ${a.length}`
			return true
		}

	} else {
		window.fs = {
			async load_json(p) {
				return fetch(p).then(e=>e.json());
			}
		}
	}
}

Object.defineProperty(window, '__init__', {
	enumerable: false,
	configurable: true,
	get: function get() {
		if (get.inited) return 'already inited'
		__init__fn(window)
		get.inited = true
		return 'inited'
	},
})

if (window.localStorage && window.localStorage.__init__) {
	window.__init__
}

window.init_wait = Promise.resolve('__init__')




__init__;








''.hashCode || Object.defineProperty(String.prototype, 'hashCode', {
	value: function() {
		var hash = 0, i, chr;
		for (i = 0; i < this.length; i++) {
			chr = this.charCodeAt(i);
			hash = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	}
});




function dig(o, fn, path = []) {
	for (let k in o) {
		path.push(k)

		if (typeof (o[k]) == 'object') {
			dig(o[k], fn, path)
		}

		fn(o, k, o[k], path)

		path.pop()
	}
}


HTMLCanvasElement.prototype.save = async function(path) {
	let p = Promise.empty();
	this.toBlob(p.r);
	let blob = await p.p;
	p = Promise.empty();
	ab = await new Response(blob).arrayBuffer();
	fs.writeFileSync(path, Buffer(ab));

}



myfns = {};


if (globalThis.nw)
yaml = require('yaml')

Object.defineValue(Object.prototype, function _values() { return Object.values(this) })
Object.defineValue(Array.prototype, function _unique(value) {
	if (typeof value == 'undefined') {
		return [...new Set(this)];
	}
	let fn;
	if (typeof value == 'string') {
		let str = value;
		fn = e => e[str];
	}
	if (typeof value == 'function') {
		fn = value;
	}
	if (fn) {
		let set = new Set();
		return this.filter(e => { let v = fn(e); if (set.has(v)) return false; set.add(v); return true; })
	}
	throw 'bad value';
})

Object.defineValue(Map.prototype, function _values() { return [...this.values()] })

function assert(truthy, messsage, data) {
	if (!truthy) {
		if (data) {
			console.error(data)
		}
		throw new Error(messsage);
	}
}