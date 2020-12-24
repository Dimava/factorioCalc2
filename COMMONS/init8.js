Promise.empty = (r,j,p)=>(p = new Promise((res,rej)=>(r = res,
j = rej)),
{
	r,
	j,
	p
});
fetch.doc = async function(url) {
	window.console.log('fetching document:', url);
	let xhr = new XMLHttpRequest();
	let p = Promise.empty();
	xhr.onload = p.r;
	xhr.open("GET", url);
	xhr.responseType = "document";
	xhr.send();
	await p.p;
	let document = xhr.responseXML;
	document.redirected = xhr.redirected;
	document.base = xhr.redirected ? null : url;
	document.url = function(a) {
		if (typeof a == 'function')
			a = a();
		if (typeof a == 'object') {
			if (a.href)
				a = a.getAttribute('href');
			else if (a.src)
				a = a.getAttribute('src');
		}
		if (typeof a == 'string') {
			return new URL(a,document.base).href;
		}
		throw todo();
	}
	return document;
}

function initQ(window) {
	function q(s, el=this) {
		return el.querySelector(s);
	}

	function qq(s, el=this) {
		return [...el.querySelectorAll(s)];
	}

	window.HTMLElement.prototype.q = q;
	window.HTMLElement.prototype.qq = qq;
	window.HTMLElement.prototype.appendTo = function(e) {
		if (typeof e == 'string')
			e = window.document.q(e);
		e.append(this);
		return this;
	}

	window.Window.prototype.q = function winq(...a) {
		return (this || window).document.documentElement.q(...a);
	}
	window.Window.prototype.qq = function winqq(...a) {
		return (this || window).document.documentElement.qq(...a);
	}

	window.Document.prototype.q = function winq(...a) {
		return this.documentElement.q(...a);
	}
	window.Document.prototype.qq = function winqq(...a) {
		return this.documentElement.qq(...a);
	}

}
initQ(window);

Object.defineGetter = function(o, name, get=name) {
	if (typeof name == 'function')
		name = name.name;
	return Object.defineProperty(o, name, {
		configurable: true,
		get
	});
}
Object.defineValue = function(o, name, value=name, enumerable=false) {
	if (typeof name == 'function')
		name = name.name;
	return Object.defineProperty(o, name, {
		enumerable,
		configurable: true,
		writable: true,
		value
	});
}

fs = require('fs')

fs.ensureSync = function ensureDirectoryExistence(file) {
	let dir = file.split('/').slice(0, -1).join('/')
	if (fs.existsSync(dir))
		return
	fs.ensureSync(dir)
	fs.mkdirSync(dir)
}

Object.defineValue(Array.prototype, async function pmap(fn, threads=5) {
	let result = Array(this.length)
	if (!((threads = +threads) > 0))
		threads = 1e6
	let activeThreads = 0

	let any = Promise.empty()
	for (let i = 0; i < this.length; i++) {
		activeThreads++
		fn(this[i], i, this).then(v=>result[i] = v).catch(e=>result[i] = e).then(()=>any.r(activeThreads--))
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
})
Object.defineValue(Array.prototype, async function pwmap(fn) {
	// fn is *syncronous* function
	const minFrameLength = 20
	let result = Array(this.length)
	let frame = Promise.frame()
	let now = performance.now()
	setProgress(0, this)
	for (let i = 0; i < this.length; i++) {
		if (performance.now() - now > minFrameLength) {
			now = await frame;
			frame = Promise.frame()
		}
		result[i] = fn(this[i], i, this)
		setProgress(i, this)
	}
	await frame
	return result
})

Object.defineValue(Promise, 'wait', (t=10)=>new Promise(r=>setTimeout(r, t)))

Object.defineValue(Promise, 'frame', (n)=>+n ? Promise.resolve().frame(n) : new Promise(r=>requestAnimationFrame(r)))

Object.defineValue(Promise, 'empty', (r,j)=>({
	p: new Promise((res,rej)=>(r = res,
	j = rej)),
	r,
	j
}))
Object.defineValue(Promise.prototype, async function wait(t=10, n=1) {
	let val = await this;
	await Promise.wait(t,n);
	return val;
})
Object.defineValue(Promise.prototype, async function frame(n) {
	let val = await this;
	await new Promise(r=>requestAnimationFrame(r));
	if (typeof n == 'number') {
		for (n--; n > 0; n--)
			await new Promise(r=>requestAnimationFrame(r));
	}
	return val;
})
Object.defineValue(Promise.prototype, function log(n) {
	return this.then(v=>(console.log('Promise resolved:',v),v),er=>{console.error('Promise rejected:',er);throw er})
})

elm = function elm(sel='', ...children) {
	let tag = 'div'
	  , cls = []
	  , id = ''
	  , attrs = [];
	;sel = sel.replace(/^[\w\-]+/, (s=>(tag = s,
	'')));

	sel = sel.replace(/\[(.*?)=(".*?"|'.*?'|.*?)\]/g, (s,attr,val)=>(attrs.push({
		attr,
		val
	}),
	''));

	sel = sel.replace(/\.([\w\-]+)/g, (s,cl)=>(cls.push(cl),
	''));

	sel = sel.replace(/\#([\w\-]+)/g, (s,d)=>(id = id || d,
	''));

	if (sel != '')
		alert('sel is not empty!\n' + sel);

	let e = document.createElement(tag);

	if (id)
		e.id = id;

	if (cls.length)
		e.className = cls.join(' ');

	attrs.forEach(({attr, val})=>{
		e.setAttribute(attr, val);
	}
	);

	if (children.length) {
		e.append(...children.filter(e=>typeof e != 'function'));
		for (let fn of children.filter(e=>typeof e == 'function')) {
			let s = fn + ''
			let fname = s.match(/\w+/)[0]
			e['on' + fname] = fn
		}
	}

	return e;
}

log = console.log.bind(console)
