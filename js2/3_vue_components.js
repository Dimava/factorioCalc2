function shortObjectNotation2(o, depth = 0, limit = 0) {
	if (typeof o == 'string')
		return `"${o}"`;
	if (typeof o != 'object' || o === null)
		return `${o}`;
	let tname = o.constructor.name;
	let entries = Object.entries(o).slice(0, (tname == 'Array' ? 2 : 1) * limit + 1);
	if (depth == 0) {
		if (tname == 'Object') {
			return entries.length ? '{...}' : '{}';
		}
		if (tname == 'Array') {
			return `Array(${o.length})`;
		}
		return tname;
	}
	entries = entries.map(([k, v], i) => {
		if (i == (tname == 'Array' ? 2 : 1) * limit)
			return '...';
		v = shortObjectNotation2(v, depth - 1, limit);
		if (tname != 'Array')
			v = `${k}: ${v}`;
		return v;
	}
	);
	let sstart = tname == 'Object' ? '{' : tname == 'Array' ? `(${o.length}) [` : tname + ' {';
	let send = tname == 'Array' ? ']' : '}';
	return sstart + entries.join(', ') + send;
}

Vue.components = {
	icon: {
		props: {
			name: String,
			type: String,
			item: Object,
			icon: IconSource,
			title: String,
			size: {
				type: Number,
				default: 32,
			}
		},
		computed: {
			my_icon() {
				let icon = this.icon
					|| this.item?.getIcon?.()
					|| this.item && IconSource.getByItem(this.item)
					|| this.name && this.type && IconSource.getByItem(this)
					|| this.name && IconSource.getByName(this.name)
					|| IconSource.unknown;
				assert(icon[this.size || 32]);
				return icon;
			},
			my_title() {
				return this.title
					|| this.item && this.item.name
					|| this.name;
			},
			my_src() {
				return IconSource.path + this.my_icon[this.size].src;
			},
			my_pos() {
				return `${-this.my_icon[this.size].x}px ${-this.my_icon[this.size].y}px`;
			},
		},
		template: `<div
			class="icon" :class="'icon-' + size"
			:title="my_title"
			:style="{
				'background-image': 'url(' + my_src + ')',
				'background-position': my_pos,
			}"
		>
		</div>`,
	},
	json: {
		props: ['name', 'value'],
		data: () => ({
			on: false
		}),
		computed: {
			type() {
				if (this.value === null) {
					return 'null';
				}
				return typeof (this.value);
			},
			isArray() {
				return Array.isArray(this.value);
			},
			shortObjectNotation() {
				return shortObjectNotation2(this.value, 1, 3);
			},
			shortOpenNotation() {
				return shortObjectNotation2(this.value, 0, 3);
			},
		},
		template: `
			<div class="json" :class="'json-'+type">
				<label>
					<input v-if="type == 'object'" type="checkbox" v-model="on"/>{{ name }}<span class="json-short">: </span>
					<span class="json-short" v-if="type == 'object' && !on"> {{ shortObjectNotation }} </span>
					<span class="json-short" v-if="isArray && on"> [ </span>
					<span class="json-short" v-else-if="type == 'object' && on"> {{ shortOpenNotation }} { </span>
				</label>
				<div v-if="type == 'object' && on">
					<li v-for="(v, k) in value">
						<json :value="v" :name="k" />
					</li>
				</div>
				<span v-if="isArray && on"> ] </span>
				<span v-else-if="type == 'object' && on"> } </span>

				<span class="json-string" v-if="type == 'string'"> "{{ value }}" </span>
				<span class="json-conts" v-else-if="type != 'object'"> {{ value }} </span>
			</div>
		`,
	},
	root: {
		props: ['root'],
		template: `
			<div id="tested"> <json :value="root" name="root"/>  </div>
		`,
	},
}

Vue.plugins = {
};


function makeApp(root) {
	globalThis.app = Vue.createApp({
		data() {
			return { rnd: 1 };
		},
		computed: {
			root: {
				get() {
					return this.rnd && root;
				},
				set(v) {
					root = v;
					this.rnd = Math.random();
				},
			}
		},
	});


	if (!globalThis.root)
		globalThis.root = null;
	if (root)
		globalThis.root = root;

	globalThis.mount = async function(html) {
		qq('#test').map(e => e.remove())

		let test = elm('#test').appendTo('body')
		test.innerHTML = html || `
			<root v-if="root" :root="root"></root>
		`;
		await Promise.frame();
		return globalThis.vm = app.mount('#test');
	}
	globalThis.tick = function(root = globalThis.root) {
		vm.root = root;
	}

	for (let [n, c] of Object.entries(Vue.components)) {
		app.component(n, c);
	}
	for (let [n, p] of Object.entries(Vue.plugins)) {
		app.use(p);
	}

	return mount;
}




function amountText(amount) {
	if (typeof amount != 'number') return amount + '';
	if ((amount + '').length <= 6)
		return amount + '';
	if (0.001 < amount && amount < 1) {
		let m = 1;
		while (amount < 1e2) {
			amount *= 10;
			m *= 10;
		}
		amount = Math.round(amount) / m;
		return amount + '';
	}
	if (0.001 < amount && amount < 1000) {
		let m = 1;
		while (amount < 1e3) {
			amount *= 10;
			m *= 10;
		}
		amount = Math.round(amount) / m;
		return amount + '';
	}
	return amount + '' + '?'
}

Object.assign(globalThis, {
	makeApp,
	amountText,
});
