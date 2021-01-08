import "./3_vue_components.js";

class ExploredRecipe {
	constructor(o = {}) {
		Object.assign(this, o)
		this.updateAmount();
		this.updateCombined();
	}
	static fromRaw({ rr, parent = null, minify = false, amount = 1, linkedItem, hidden }) {
		return new ExploredRecipe({
			recipe: MulRecipe.fromRaw(Recipe.fromRawPure(rr, true), amount),
			raw: rr,
			consumers: [],
			producers: [],
			parent: parent || null,
			config: parent?.config,
			minify: !!minify,
			linkedItem,
			hidden,
			amount,
		})
	}
	static makeRoot(config) {
		return new ExploredRecipe({
			consumers: [],
			producers: [],
			parent: null,
			config: config || {
				reverse: false,
				multiply: false,
				hidden: true,
				combined: false,
			},
		})
	}
	parentList() {
		if (!this.parent) return null;
		if (this.parent.consumers.includes(this)) return 'consumers';
		if (this.parent.producers.includes(this)) return 'producers';
		throw parentList;
	}
	toJson() {
		let json = {};
		if (this.raw)
			json.recipe = this.raw.name;
		if (this.consumers.length)
			json.consumers = this.consumers.map(e => e.toJson());
		if (this.producers.length)
			json.producers = this.producers.map(e => e.toJson());
		if (this.linkedItem)
			json.linkedItem = this.linkedItem.name;
		if (this.minify)
			json.minify = this.minify;
		if (this.hidden)
			json.hidden = this.hidden;
		return json;
	}

	static fromJson(json, parent) {
		if (typeof json == 'string') json = JSON.parse(json);
		let rr = reciped[json.recipe];
		let ex = rr ? ExploredRecipe.fromRaw({
			rr, parent,
			minify: json.minify, amount: json.amount, hidden: json.hidden,
			linkedItem: itemd[json.linkedItem]
		}) : ExploredRecipe.makeRoot(json.config);
		ex.consumers.push(...(json.consumers ?? []).map(e => ExploredRecipe.fromJson(e, ex)));
		ex.producers.push(...(json.producers ?? []).map(e => ExploredRecipe.fromJson(e, ex)));
		for (let p of ex.producers) {
			p.hidden && p.combineIntoParent()
		}
		for (let p of ex.consumers) {
			p.hidden && p.combineIntoParent()
		}
		return ex;
	}
	getRoot() {
		return this.parent?.getRoot() ?? this;
	}

	addIntoRoot(rr) {
		if (rr instanceof ExploredRecipe) {
			rr = rr.raw;
		}
		let root = this.getRoot()
		root.producers.push(ExploredRecipe.fromRaw({ rr, parent: root }));
		return this;
	}
	unwrapIngredient(i) {
		// log('unwrapIngredient')
		let children = i.item.rawMadeIn.map(rr =>
			ExploredRecipe.fromRaw({ rr, parent: this, linkedItem: i.item, minify: i.item.rawMadeIn.length > 1 }));
		this.consumers.push(...children);
	}
	unwrapProduct(p) {
		// log('unwrapProduct')
		let children = p.item.rawUsedIn.map(rr =>
			ExploredRecipe.fromRaw({ rr, parent: this, linkedItem: p.item, minify: p.item.rawUsedIn.length > 1 }));
		this.producers.push(...children);
	}
	remove() {
		// log('remove')
		if (!this.parent)
			return console.warn('failed to remove');
		if (this.parent.consumers.includes(this)) {
			return this.parent.consumers.splice(this.parent.consumers.indexOf(this), 1);
			return;
		}
		if (this.parent.producers.includes(this)) {
			return this.parent.producers.splice(this.parent.producers.indexOf(this), 1);
			return;
		}
		console.warn('failed to remove');
	}
	combineIntoParent() {
		let parent = this.parent;
		let cr;
		if (this.parentList() == 'producers') {
			cr = CombinedRecipe.combine(this.linkedItem, this.recipe, parent.recipe, true);
		} else {
			cr = CombinedRecipe.combine(this.linkedItem, parent.recipe, this.recipe, false);
		}
		this.hidden = true;
		parent.recipe = cr;
		let copy = ExploredRecipe.fromJson(this.toJson(), parent);
		parent.consumers.push(...copy.consumers.filter(e => !e.hidden));
		parent.producers.push(...copy.producers.filter(e => !e.hidden));
		parent.updateAmount();
		parent.$vm?.up();
	}
	deminify(leaveMinified) {
		// log('deminify')
		if (!this.parent || !this.minify)
			return;
		this.minify = false;
		if (!leaveMinified) {
			this.removeNeighbourMinified();
		}
	}
	removeNeighbourMinified() {
		// log('removeNeighbourMinified')
		// if (!this.parent || !this.minify) return;
		if (this.parent.producers.includes(this) && this.parent.producers.find(e => e.minify)) {
			this.parent.producers = this.parent.producers.filter(e => !e.minify);
			return;
		}
		if (this.parent.consumers.includes(this) && this.parent.consumers.find(e => e.minify)) {
			this.parent.consumers = this.parent.consumers.filter(e => !e.minify);
			return;
		}
		console.warn('failed to removeNeighbourMinified', this)
	}

	static makeSampleRoot() {
		if (globalThis.gameName == 'seablock')
			return ExploredRecipe.fromJson(`
{"producers":[{"recipe":"crystal-slurry-filtering-conversion-1","consumers":[{"r
ecipe":"crystal-dust-liquify","consumers":[{"recipe":"geode-blue-processing","co
nsumers":[{"recipe":"solid-geodes","consumers":[{"recipe":"washing-1","consumers
":[{"recipe":"pumping--seafloor-pump","linkedItem":"water-viscous-mud"}],"linked
Item":"water-heavy-mud"}],"producers":[{"recipe":"geode-cyan-processing","linked
Item":"geode-cyan","hidden":true},{"recipe":"geode-lightgreen-processing","linke
dItem":"geode-lightgreen","hidden":true},{"recipe":"geode-purple-processing","li
nkedItem":"geode-purple","hidden":true},{"recipe":"geode-red-processing","linked
Item":"geode-red","hidden":true},{"recipe":"geode-yellow-processing","linkedItem
":"geode-yellow","hidden":true}],"linkedItem":"geode-blue"}],"linkedItem":"cryst
al-dust"}],"linkedItem":"crystal-slurry"}],"producers":[{"recipe":"filter-coal",
"linkedItem":"filter-frame","hidden":true},{"recipe":"slag-processing-1","linked
Item":"mineral-sludge"},{"recipe":"yellow-waste-water-purification","producers":
[{"recipe":"gas-sulfur-dioxide","producers":[{"recipe":"liquid-sulfuric-acid","l
inkedItem":"gas-sulfur-dioxide"}],"linkedItem":"sulfur"}],"linkedItem":"water-ye
llow-waste"}]},{"recipe":"sb-wood-bricks-charcoal","consumers":[{"recipe":"wood-
bricks","consumers":[{"recipe":"wood-pellets","consumers":[{"recipe":"cellulose-
fiber-algae","consumers":[{"recipe":"algae-green","consumers":[{"recipe":"carbon
-separation-2","linkedItem":"gas-carbon-dioxide"}],"linkedItem":"algae-green"}],
"linkedItem":"cellulose-fiber"}],"linkedItem":"wood-pellets"}],"linkedItem":"woo
d-bricks"}]}]}
	`.replace(/\n/g, ''));
		return ExploredRecipe.fromJson({ producers: [{ recipe: 'iron-gear-wheel' }] })
	}


	updateAmount(onlySelf = false) {
		if (!this.config.multiply && this.recipe) {
			if (this.recipe instanceof MulRecipe)
				this.recipe = MulRecipe.fromRaw(Recipe.fromRawPure(this.raw, true), 1);
			else if (this.recipe.recipes[0].amount != 1) {
				this.recipe = this.recipe.multiplyBy(1 / this.recipe.recipes[0].amount);
			}
		} else {
			let multiplier = 1;
			let item = this.linkedItem;
			if (this.parent && this.parent.recipe) {
				if (this.parent.producers.includes(this)) {
					let out = this.recipe, inp = this.parent.recipe;
					multiplier = out.ingredientAmount(item) / inp.productAmount(item);
					multiplier = 1 / multiplier;
				}
				if (this.parent.consumers.includes(this)) {
					let inp = this.recipe, out = this.parent.recipe;
					multiplier = out.ingredientAmount(item) / inp.productAmount(item);
				}
				if (this.hidden && this.parent.recipe instanceof CombinedRecipe
					&& this.parent.recipe.recipes.find(e => e.name == this.raw.name)) {
					let amount = this.parent.recipe.recipes.find(e => e.name == this.raw.name).amount;
					multiplier = amount / (this.recipes?.[0]?.amount ?? this.recipe.amount);
				}
				this.recipe = this.recipe.multiplyBy(multiplier)
			}
		}

		for (let ex of this.producers) {
			ex.updateAmount();
		}
		for (let ex of this.consumers) {
			ex.updateAmount();
		}

		this.$vm?.up();
	}

	updateCombined() {
		if (!this.parent) {
			for (let ex of this.producers) {
				if (ex.hidden) continue;
				ex.updateCombined();
			}
			for (let ex of this.consumers) {
				if (ex.hidden) continue;
				ex.updateCombined();
			}
			return;
		}

		let cr = this.recipe;
		for (let ex of this.producers) {
			if (ex.hidden || ex.minify) continue;
			ex.updateCombined();
			cr = CombinedRecipe.combine(ex.linkedItem, ex.combined, cr, true);
		}
		for (let ex of this.consumers) {
			if (ex.hidden || ex.minify) continue;
			ex.updateCombined();
			cr = CombinedRecipe.combine(ex.linkedItem, cr, ex.combined, false);
		}

		this.combined = cr;

	}
}



Vue.components['re-root'] = {
	props: ['explore', 'root'],
	data() {
		return { ctrl: false, shift: false };
	},
	methods: {
		up() {
			this.$forceUpdate();
		},
		producers() {
			return this.explore.producers.slice();
		},
		reverse() {
			this.explore.config.reverse = !this.explore.config.reverse;
			this.up();
		},
		multiply() {
			this.explore.config.multiply = !this.explore.config.multiply;
			this.explore.updateAmount();
			this.up();
		},
		hidden() {
			this.explore.config.hidden = !this.explore.config.hidden;
			this.explore.updateAmount();
			this.up();
		},
		combined() {
			this.explore.config.combined = !this.explore.config.combined;
			this.explore.updateAmount();
			this.explore.updateCombined();
			this.up();
		},
		reset() {
			Object.assign(this.explore, ExploredRecipe.makeSampleRoot());
			this.explore.updateAmount();
			this.explore.updateCombined();
			this.up();
		},
	},
	created() {
		this.explore.$vm = this;
		log('created re-root', this)
	},
	template: `
		<button @click="reset"> reset </button>
		<button @click="reverse"> reverse: {{ explore.config.reverse }} </button>
		<button @click="multiply"> multiply: {{ explore.config.multiply }} </button>
		<button @click="hidden"> hidden: {{ explore.config.hidden }} </button>
		<button @click="combined"> combined: {{ explore.config.combined }} </button>
		<button @click="(ctrl = !ctrl)&&(shift = false)"> ctrl: {{ ctrl }} </button>
		<button @click="(shift = !shift)&&(ctrl = false)"> shift: {{ shift }} </button>
		<br>
		<re-list-holder
			:class="{'re-reverse':explore.config.reverse, 're-multiply':explore.config.multiply}"
			:list="producers()" :root="this" @up="up" />
	`,
}

Vue.components['re-list-holder'] = {
	props: ['explore', 'list', 'root'],
	emits: ['up'],
	methods: {
		up(bubble) {
			this.$forceUpdate();
			this.$emit('up', bubble);
		},
	},
	template: `
		<div class="re-list-holder">
			<template v-for="ex of list">
				<re-holder v-if="!ex.minify" :explore="ex" :root="root" @up="up" :style="{opacity: ex.hidden?0.5:1}"/>
				<re-minify-holder v-if="ex.minify" :explore="ex" :root="root" @up="up" :style="{opacity: ex.hidden?0.5:1}"/>
			</template>
		</div>
	`,
}

Vue.components['re-holder'] = {
	props: ['explore', 'root'],
	emits: ['up'],
	methods: {
		up(bubble) {
			this.$forceUpdate();
			bubble && this.$emit('up', bubble);
		},
		remove() {
			this.explore.remove()
			this.$forceUpdate();
			this.$emit('up')
		},
		amountText,
		producers() {
			return this.explore.producers.filter(this.explore.config.hidden ? (e => e) : (e => !e.hidden));
		},
		consumers() {
			return this.explore.consumers.filter(this.explore.config.hidden ? (e => e) : (e => !e.hidden));
		},
		recipe() {
			return this.explore.config.combined ? this.explore.combined : this.explore.recipe;
		},
		my_click() {
			if (this.root.shift) {
				this.explore.addIntoRoot(this.explore);
				this.up(true);
			} else if (this.root.ctrl) {
				this.explore.combineIntoParent();
				this.up(true);
			}
		},
	},
	created() {
		this.explore.$vm = this;
	},
	template: `
		<div class="re-holder">
			<re-list-holder class="re-children-producer" v-if="producers().length"
				:explore="explore" :list="producers()" :root="root" @up="up" />

			<div class="re-recipe"
					@contextmenu.prevent="remove"
					@click.exact="my_click"
					@click.shift.exact="explore.addIntoRoot(explore),up(true)"
					@click.ctrl.exact="explore.combineIntoParent(),up(true)">
				<div class="re-products">
					<div class="re-product" v-for="p of recipe().products" @click="explore.unwrapProduct(p),up()">
						<icon class="re-product-icon" :item="p" :size="16" />
						<div class="re-product-amount"> {{ amountText(p.amount) }} </div>
					</div>
				</div>
				<div class="re-recipe-recipe">
					<icon class="re-recipe-recipe-icon" :item="recipe()" />
				</div>
				<div class="re-ingredients">
					<div class="re-ingredient" v-for="i of recipe().ingredients" @click="explore.unwrapIngredient(i),up()">
						<icon class="re-ingredient-icon" :item="i" :size="16" />
						<div class="re-ingredient-amount"> {{ amountText(i.amount) }} </div>
					</div>
				</div>
			</div>

			<re-list-holder class="re-children-consumer" v-if="consumers().length"
				:explore="explore" :list="consumers()" :root="root" @up="up" />
		</div>
	`,
}

Vue.components['re-minify-holder'] = {
	props: ['explore', 'minify', 'root'],
	emits: ['up'],
	methods: {
		up(bubble) {
			this.$forceUpdate();
			bubble && this.$emit('up', bubble);
		},
		deminify($event) {
			this.explore.deminify($event.shiftKey || this.root.shift);
			this.$emit('up');
		},
		removeNeighbourMinified() {
			this.explore.removeNeighbourMinified();
			this.$emit('up');
		},
	},
	template: `
		<div class="re-holder re-minify-holder" @click="deminify" @contextmenu.prevent="removeNeighbourMinified">
			<div class="re-recipe re-minify">
				<div class="re-products re-minify">
					<div class="re-product re-minify" v-for="p of explore.recipe.products">
						<icon class="re-product-icon" :item="p" :size="16" />
					</div>
				</div>
				<div class="re-recipe-recipe re-minify">
					<div class="re-recipe-recipe-icon">
						<icon class="re-recipe-recipe-icon" :item="explore.recipe" />
					</div>
				</div>
				<div class="re-ingredients re-minify">
					<div class="re-ingredient re-minify" v-for="i of explore.recipe.ingredients">
						<icon class="re-ingredient-icon" :item="i" :size="16" />
					</div>
				</div>
			</div>
		</div>
	`,
}

// root = {
// 	explore: ExploredRecipe.makeSampleRoot(),
// };

// makeApp(root)(`
// 	<re-root :explore="root.explore"></re-root>
// 	<root v-if="root" :root="root"></root>
// 	<div contenteditable="true">text</div>
// `);


Object.assign(globalThis, {
	ExploredRecipe,
});