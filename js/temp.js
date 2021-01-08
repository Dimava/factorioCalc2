r = reciped.accumulator
r = reciped["biter-medium-keeping"]

ExploredRecipe = class ExploredRecipe {
	constructor(o = {}) {
		Object.assign(this, o)
	}
	static fromRaw(rr, parent = null, minify = false) {
		return new ExploredRecipe({
			recipe: MulRecipe.fromRaw(Recipe.fromRawPure(rr, true)),
			raw: rr,
			consumers: [],
			producers: [],
			parent: parent || null,
			minify: !!minify,
		})
	}
	static makeRoot() {
		return new ExploredRecipe({
			consumers: [],
			producers: [],
			parent: null,
		})
	}
	toJson() {
		let json = {};
		if (this.raw)
			json.recipe = this.raw.name;
		if (this.consumers.length)
			json.consumers = this.consumers.map(e => e.toJson());
		if (this.producers.length)
			json.producers = this.producers.map(e => e.toJson());
		if (this.minify)
			json.minify = this.minify;
		return json;
	}

	static fromJson(json, parent) {
		if (typeof json == 'string') json = JSON.parse(json);
		let r = reciped[json.recipe];
		let ex = r ? ExploredRecipe.fromRaw(r, parent, json.minify) : ExploredRecipe.makeRoot();
		ex.consumers.push(...(json.consumers ?? []).map(e => ExploredRecipe.fromJson(e, ex)));
		ex.producers.push(...(json.producers ?? []).map(e => ExploredRecipe.fromJson(e, ex)));
		return ex;
	}

	addIntoRoot(rr) {
		if (rr instanceof ExploredRecipe) {
			rr = rr.raw;
		}
		let root = this;
		while (root.parent)
			root = root.parent;
		root.producers.push(ExploredRecipe.fromRaw(rr, root, false));
		return this;
	}
	unwrapIngredient(i) {
		// log('unwrapIngredient')
		let children = i.item.rawMadeIn.map(rr => ExploredRecipe.fromRaw(rr, this, i.item.rawMadeIn.length > 1));
		this.consumers.push(...children);
	}
	unwrapProduct(p) {
		// log('unwrapProduct')
		let children = p.item.rawUsedIn.map(rr => ExploredRecipe.fromRaw(rr, this, p.item.rawUsedIn.length > 1));
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
		if (this.parent.consumers.includes(this) && this.parent.consumers.find(e => e.minify)) {
			this.parent.consumers = this.parent.consumers.filter(e => !e.minify);
			return;
		}
		if (this.parent.producers.includes(this) && this.parent.producers.find(e => e.minify)) {
			this.parent.producers = this.parent.producers.filter(e => !e.minify);
			return;
		}
		console.warn('failed to removeNeighbourMinified', this)
	}
}

Vue.components['re-root'] = {
	props: ['explore'],
	methods: {
		up() {
			log('up root')
		},
		exroot() {
			log('computed root.exroot')
			return this.root.exroot;
		},
		producers() {
			return this.explore.producers.slice();
		},
	},
	template: `
		<re-list-holder :root="null" :list="producers()" @up="up" />
	`,
}

Vue.components['re-list-holder'] = {
	props: ['explore', 'list'],
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
				<re-holder v-if="!ex.minify" :explore="ex" @up="up" />
				<re-minify-holder v-if="ex.minify" :explore="ex" @up="up" />
			</template>
		</div>
	`,
}

Vue.components['re-holder'] = {
	props: ['explore'],
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
			return this.explore.producers.slice();
		},
		consumers() {
			return this.explore.consumers.slice();
		},
	},
	created() {
		this.explore.$vm = this;
	},
	template: `
		<div class="re-holder">
			<re-list-holder class="re-children-producer" v-if="producers().length"
				:explore="explore" :list="producers()" @up="up" />

			<div class="re-recipe" @contextmenu.prevent="remove" @click.shift="explore.addIntoRoot(explore),up(true)">
				<div class="re-products">
					<div class="re-product" v-for="p of explore.recipe.products" @click="explore.unwrapProduct(p),up()">
						<icon class="re-product-icon" :item="p" :size="16" />
						<div class="re-product-amount"> {{ amountText(p.amount) }} </div>
					</div>
				</div>
				<div class="re-recipe-recipe">
					<icon class="re-recipe-recipe-icon" :item="explore.recipe" />
				</div>
				<div class="re-ingredients">
					<div class="re-ingredient" v-for="i of explore.recipe.ingredients" @click="explore.unwrapIngredient(i),up()">
						<icon class="re-ingredient-icon" :item="i" :size="16" />
						<div class="re-ingredient-amount"> {{ amountText(i.amount) }} </div>
					</div>
				</div>
			</div>

			<re-list-holder class="re-children-consumer" v-if="consumers().length"
				:explore="explore" :list="consumers()" @up="up" />
		</div>
	`,
}

Vue.components['re-minify-holder'] = {
	props: ['explore', 'minify'],
	emits: ['up'],
	methods: {
		up(bubble) {
			this.$forceUpdate();
			bubble && this.$emit('up', bubble);
		},
		deminify($event) {
			this.explore.deminify($event.shiftKey);
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

ex = new ExploredRecipe({})

root = {
	explore: ExploredRecipe.fromJson(`
{"producers":[{"recipe":"crystal-slurry-filtering-conversion-1","consumers":[{"recipe":"crystal-dust-liquify",
"consumers":[{"recipe":"geode-blue-processing"},{"recipe":"geode-purple-processing"},{"recipe":
"geode-yellow-processing","consumers":[{"recipe":"solid-geodes","consumers":[{"recipe":"washing-1","consumers":
[{"recipe":"pumping--seafloor-pump"}]}]}]},{"recipe":"geode-lightgreen-processing"},{"recipe":"geode-cyan-processing"}
,{"recipe":"geode-red-processing"}]},{"recipe":"water-mineralized","consumers":[{"recipe":"pumping--offshore-pump"}]}]
,"producers":[{"recipe":"filter-coal"},{"recipe":"slag-processing-1"},{"recipe":"yellow-waste-water-purification",
"producers":[{"recipe":"gas-sulfur-dioxide","producers":[{"recipe":"liquid-sulfuric-acid"}]}]}]},{"recipe":
"sb-wood-bricks-charcoal","consumers":[{"recipe":"wood-bricks","consumers":[{"recipe":"wood-pellets","consumers":
[{"recipe":"cellulose-fiber-algae","consumers":[{"recipe":"algae-green","consumers":[{"recipe":"carbon-separation-2"}]}]}]}]}]}]}
	`)
};

makeApp(root)(`
	<re-root :explore="root.explore"></re-root>
	<root v-if="root" :root="root"></root>
	<div contenteditable="true">text</div>
`);
