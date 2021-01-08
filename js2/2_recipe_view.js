import "./1_make_icons.js";


/** item in its production chain */
class Item {
	/**
	 @param {string} name
	 */
	constructor({ name, type }) {
		this.name = name;
		this.type = type;

		this.usedIn = [];
		this.madeIn = [];

		/** @type {RawRecipe[]} */
		this.rawUsedIn = [];
		/** @type {RawRecipe[]} */
		this.rawMadeIn = [];

		this.tier = -1;
	}

	/** if it can be produced with only one recipe */
	isDirect() {
		return this.madeIn.length == 1 && this.madeIn[0];
	}
	/** if it can be produced with only one recipe */
	isRawDirect() {
		return this.rawMadeIn.length == 1 && this.rawMadeIn[0];
	}

	static fromRaw(rawItem) {
		let id = `${rawItem.type}.${rawItem.name}`;
		assert(id != 'undefined.undefined');
		if (Item.itemsById.has(id)) {
			return Item.itemsById.get(id);
		}
		let item = new Item(rawItem);
		Item.itemsById.set(id, item);
		return item;
	}

	static get(type, name) {
		let id = `${type}.${name}`;
		return Item.itemsById.get(id);
	}

	clear() {
		this.usedIn = [];
		this.madeIn = [];
	}
	addUsed(r) {
		!this.usedIn.includes(r) && this.usedIn.push(r);
	}
	popUsed(r) {
		this.usedIn.includes(r) && this.usedIn.splice(this.usedIn.indexOf(r), 1);
	}
	addMade(r) {
		!this.madeIn.includes(r) && this.madeIn.push(r);
	}
	popMade(r) {
		this.madeIn.includes(r) && this.madeIn.splice(this.madeIn.indexOf(r), 1);
	}

	getIcon() {
		return IconSource.getByItem(this);
	}
}

/** @type {Map.<string, item>} */
Item.itemsById = new Map();


/** raw recipe consumption of an item */
class RawIngredient {
	constructor(o) {
		Object.assign(this, o);
		/** @type {Item} */
		this.item;
		/** @type {string} */
		this.type;
		/** @type {string} */
		this.name;
		/** @type {number} */
		this.probability;
	}
	static fromRaw({
		type,
		name,
		amount,
		catalyst_amount,
		fluidbox_index,
		maximum_temperature,
		minimum_temperature,
		temperature,
	}) {
		return new RawIngredient(Object.fromEntries(Object.entries({
			item: Item.fromRaw({ type, name }),
			type,
			name,
			amount,
			catalyst_amount,
			fluidbox_index,
			maximum_temperature,
			minimum_temperature,
			temperature,
		}).filter(([k, v]) => v != undefined)));
	}

	adjustedAmount() {
		return this.amount;
	}

	getIcon() {
		return IconSource.getByItem(this.item);
	}
}
/** raw recipe production of an item */
class RawProduct {
	/** @param {{type, name, probability}} o */
	constructor(o) {
		Object.assign(this, o);
		/** @type {Item} */
		this.item;
		/** @type {string} */
		this.type;
		/** @type {string} */
		this.name;
		/** @type {number} */
		this.probability;
	}
	static fromRaw({
		type,
		name,
		probability,
		amount,
		catalyst_amount,
		amount_min,
		amount_max,
		fluidbox_index,
		temperature,
	}) {
		assert(amount != 0, 'bad product amount', arguments[0]);
		assert(typeof amount == 'number' || typeof (amount_min + amount_max) == 'number',
			'missing amount', arguments[0]);
		assert(typeof probability == 'number', 'missing probability', arguments[0]);

		return new RawProduct(Object.fromEntries(Object.entries({
			item: Item.fromRaw({ type, name }),
			type,
			name,
			probability, // always number
			amount, // can't be 0
			catalyst_amount,
			amount_min,
			amount_max,
			fluidbox_index,
			temperature,
		}).filter(([k, v]) => v != undefined)));
	}

	adjustedAmount() {
		let amount = this.amount || (this.amount_min + this.amount_max) / 2;
		return this.probability * amount;
	}
	getIcon() {
		return IconSource.getByItem(this.item);
	}
}

/** total recipe consumption of an item */
class Ingredient {
	/**
	 @param {Object} ingedient
	 @param {string} ingedient.name
	 @param {string} ingedient.type
	 @param {number} ingedient.amount
	 @param {Item} ingedient.item
	 */
	constructor({ name, type, amount, item }) {
		this.name = name;
		this.type = type;
		this.amount = amount;
		this.item = item;
	}
	/** @param {RawIngredient} r */
	static fromRaw(r) {
		return new Ingredient({
			name: r.name,
			type: r.type,
			amount: r.adjustedAmount(),
			item: r.item,
		});
	}
	adjustedAmount() {
		return this.amount;
	}

	/** @param {number} amount */
	addAmount(amount) {
		return new Ingredient({
			name: this.name,
			type: this.type,
			amount: this.amount + amount,
			item: this.item,
		});
	}
	multiplyBy(multiplier) {
		return new Ingredient({
			name: this.name,
			type: this.type,
			amount: this.amount * multiplier,
			item: this.item,
		});
	}
	getIcon() {
		return IconSource.getByItem(this.item);
	}
}
/** total recipe production of an item */
class Product {
	/**
	 @param {Object} product
	 @param {string} product.name
	 @param {string} product.type
	 @param {number} product.amount
	 @param {Item} product.item
	 */
	constructor({ name, type, amount, item }) {
		this.name = name;
		this.type = type;
		this.amount = amount;
		this.item = item;
	}
	/** @param {RawProduct} r */
	static fromRaw(r) {
		return new Product({
			name: r.name,
			type: r.type,
			amount: r.adjustedAmount(),
			item: r.item,
		});
	}
	adjustedAmount() {
		return this.amount;
	}

	/** @param {number} amount */
	addAmount(amount) {
		return new Product({
			name: this.name,
			type: this.type,
			amount: this.amount + amount,
			item: this.item,
		});
	}
	multiplyBy(multiplier) {
		return new Product({
			name: this.name,
			type: this.type,
			amount: this.amount * multiplier,
			item: this.item,
		});
	}
	getIcon() {
		return IconSource.getByItem(this.item);
	}
}

class RecipeMeta {
	constructor(o) {
		Object.assign(this, o);
	}
	static fromRaw({
		name, localised_name, localised_description,
		enabled, category, ingredients, products,
		hidden, // barrels, void
		hidden_from_flow_stats, // barrels
		energy, order,
		group: { name: group },
		subgroup: { name: subgroup },
		force: { name: force },
		prototype: {
			main_product, hidden_from_player_crafting, always_show_made_in,
			request_paste_multiplier,
			overload_multiplier, // === 0
			allow_as_intermediate, allow_intermediates, show_amount_in_title,
			always_show_products, emissions_multiplier, allow_decomposition,
			unlock_results, // === true
		},
	}) {
		return new RecipeMeta({
			name, localised_name, localised_description, enabled, category,
			ingredients: ingredients.map(RawIngredient.fromRaw),
			products: products.map(RawProduct.fromRaw),
			hidden, energy, order, group, subgroup, force,
			main_product: main_product && Item.fromRaw(main_product),
			hidden_from_player_crafting, always_show_made_in, request_paste_multiplier,
			allow_as_intermediate, allow_intermediates, show_amount_in_title,
			always_show_products, emissions_multiplier, allow_decomposition,
		});
	}
	getIcon() {
		return IconSource.getByItem({ name: this.name, type: 'recipe' });
	}
}

/** ingredients and products, divided as is */
class RawRecipe {
	/**
	 @param {Object} recipe
	 @param {string} recipe.name
	 @param {RawIngredient[]} recipe.ingredients
	 @param {RawProduct[]} recipe.products
	 @param {RecipeMeta} recipe.meta
	 */
	constructor({ name, ingredients, products, meta }) {
		this.name = name;
		this.ingredients = ingredients;
		this.products = products;
		this.meta = meta;
	}
	static fromRaw(r) {
		return new RawRecipe({
			name: r.name,
			ingredients: r.ingredients.map(RawIngredient.fromRaw),
			products: r.products.map(RawProduct.fromRaw),
			meta: RecipeMeta.fromRaw(r),
		});
	}
	toRecipe() {
		return Recipe.fromRaw(this);
	}
	ingredientAmount(item) {
		return this.ingredients.reduce((v, e) => e.item == item ? v + e.adjustedAmount() : v, 0);
	}
	productAmount(item) {
		return this.products.reduce((v, e) => e.item == item ? v + e.adjustedAmount() : v, 0);
	}
	getIcon() {
		return IconSource.getByItem({ name: this.name, type: 'recipe' });
	}
}

RawRecipe.prototype.type = 'recipe';



class GenericRecipe {

	reduceItemLists(noReduce = false) {
		/** @type {Map.<Item, Ingredient>} */
		let imap = new Map();
		for (let i of this.ingredients) {
			if (i.amount < 1e-8) {
				continue;
			}
			if (imap.has(i.item)) {
				i = imap.get(i.item).addAmount(i.amount);
			}
			imap.set(i.item, i);
		}
		/** @type {Map.<Item, Product>} */
		let pmap = new Map();
		for (let p of this.products) {
			if (p.amount < 1e-8) {
				continue;
			}
			if (imap.has(p.item) && !noReduce) {
				let i = imap.get(p.item);
				if (Math.abs(i.amount - p.amount) < 1e-8) {
					imap.delete(i.item);
					continue;
				}
				if (i.amount > p.amount) {
					i = i.addAmount(-p.amount);
					imap.set(i.item, i);
					continue;
				}
				imap.delete(i.item);
				p = p.addAmount(-i.amount);
			}
			if (pmap.has(p.item)) {
				p = pmap.get(p.item).addAmount(p.amount);
			}
			pmap.set(p.item, p);
		}
		this.ingredients = Array.from(imap.values());
		this.products = Array.from(pmap.values());
		return this;
	}
	addUsedMade() {
		for (let i of this.ingredients) {
			i.item.addUsed(this);
		}
		for (let p of this.products) {
			p.item.addMade(this);
		}
		return this;
	}
	ingredientAmount(item) {
		return this.ingredients.reduce((v, i) => i.item == item ? v + i.amount : v, 0);
	}
	productAmount(item) {
		return this.products.reduce((v, p) => p.item == item ? v + p.amount : v, 0);
	}
	getIcon() {
		return IconSource.getByItem({ name: this.name, type: 'recipe' });
	}
}


/** total ingredients and products */
class Recipe extends GenericRecipe {
	/**
	 @param {Object} recipe
	 @param {string} recipe.name
	 @param {Ingredient[]} recipe.ingredients
	 @param {Product[]} recipe.products
	 @param {RawRecipe} recipe.raw
	 @param {RecipeMeta} recipe.meta
	 */
	constructor({ name, ingredients, products, raw, meta }) {
		super();
		this.name = name;
		this.ingredients = ingredients;
		this.products = products;
		this.raw = raw;
		this.meta = meta;
	}
	/** @param {RawRecipe} r */
	static fromRaw(r) {
		return new Recipe({
			name: r.name,
			ingredients: r.ingredients.map(i => Ingredient.fromRaw(i)),
			products: r.products.map(p => Product.fromRaw(p)),
			raw: r,
			meta: r.meta,
		}).reduceItemLists();
	}
	/** @param {RawRecipe} r */
	static fromRawPure(rr, reduceLists) {
		let r = new Recipe({
			name: rr.name,
			ingredients: rr.ingredients.map(i => Ingredient.fromRaw(i)),
			products: rr.products.map(p => Product.fromRaw(p)),
			raw: rr,
			meta: rr.meta,
		});
		if (reduceLists) {
			r.reduceItemLists(true);
		}
		return r;
	}
}

class MulRecipe extends GenericRecipe {
	/**
	 @param {Object} mulRecipe
	 @param {string} mulRecipe.name
	 @param {number} mulRecipe.amount
	 @param {Recipe} mulRecipe.recipe
	 */
	constructor({ name, amount, recipe }) {
		super();
		this.name = name;
		this.amount = amount;
		this.recipe = recipe;
	}
	/** @param {Recipe} r */
	static fromRaw(r, amount = 1) {
		if (r instanceof RawRecipe) {
			r = Recipe.fromRaw(r);
		}
		return new MulRecipe({
			name: r.name,
			amount,
			recipe: r,
		});
	}

	/** @param {number} amount */
	addAmount(amount) {
		return new MulRecipe({
			name: this.name,
			amount: this.amounts + amount,
			recipe: this.recipe,
		});
	}
	multiplyBy(multiplier) {
		return new MulRecipe({
			name: this.name,
			amount: this.amount * multiplier,
			recipe: this.recipe,
		});
	}

	get ingredients() {
		return this.recipe.ingredients.map(i => i.multiplyBy(this.amount));
	}
	get products() {
		return this.recipe.products.map(p => p.multiplyBy(this.amount));
	}
	getIcon() {
		return IconSource.getByItem({ name: this.recipe.name, type: 'recipe' });
	}
}

/** multiple recipes combined */
class CombinedRecipe extends GenericRecipe {
	/**
	 @param{Object} source
	 @param{Ingredient[]} source.ingredients
	 @param{Product[]} source.products
	 @param{MulRecipe[]} source.recipes
	 */
	constructor({ ingredients, products, recipes }) {
		super();
		this.ingredients = ingredients;
		this.products = products;
		this.recipes = recipes;
		this.name = this.recipes[0].name;
	}

	static fromRaw(r) {
		if (r instanceof RawRecipe) {
			r = Recipe.fromRaw(r);
		}
		return new CombinedRecipe({
			ingredients: r.ingredients,
			products: r.products,
			recipes: [MulRecipe.fromRaw(r)],
		});
	}

	reduceRecipeList() {
		/** @type {Map.<Item, MulRecipe>} */
		let rmap = new Map();
		for (let r of this.recipes) {
			if (rmap.has(r.recipe)) {
				r = rmap.get(r.recipe).addAmount(r.amount);
			}
			rmap.set(r.recipe, r);
		}
		this.recipes = Array.from(rmap.values());
		return this;
	}


	multiplyBy(multiplier) {
		return new CombinedRecipe({
			ingredients: this.ingredients.map(i => i.multiplyBy(multiplier)),
			products: this.products.map(p => p.multiplyBy(multiplier)),
			recipes: this.recipes,
		});
	}

	/**
	 @param{Item} item
	 @param{CombinedRecipe} out
	 @param{CombinedRecipe} inp
	 */
	static combine(item, out, inp, swapPrimary) {
		if (!(out instanceof CombinedRecipe)) {
			out = CombinedRecipe.fromRaw(out);
		}
		if (!(inp instanceof CombinedRecipe)) {
			inp = CombinedRecipe.fromRaw(inp);
		}
		let multiplier = out.ingredientAmount(item) / inp.productAmount(item);
		if (swapPrimary) {
			[inp, out] = [out, inp];
			multiplier = 1 / multiplier;
		}
// 		log({ multiplier })
		return new CombinedRecipe({
			ingredients: out.ingredients.concat(inp.ingredients.map(i => i.multiplyBy(multiplier))),
			products: out.products.concat(inp.products.map(p => p.multiplyBy(multiplier))),
			recipes: out.recipes.concat(inp.recipes.map(r => r.multiplyBy(multiplier))),
		}).reduceItemLists().reduceRecipeList();
	}

	/**
	 @param{Item} item
	 @param{CombinedRecipe} out
	 @param{CombinedRecipe} inp
	 */
	static combine2(item, out, inp, swapPrimary) {
		if (!(out instanceof CombinedRecipe)) {
			out = CombinedRecipe.fromRaw(out);
		}
		if (!(inp instanceof CombinedRecipe)) {
			inp = CombinedRecipe.fromRaw(inp);
		}
		let [prim, sec] = !swapPrimary ? [out, int] : [inp, out];
		let multiplier = !swapPrimary ? out.ingredientAmount(item) / inp.productAmount(item) : out.ingredientAmount(item) / inp.productAmount(item);
		if (swapMain) { [inp, out] = [out, inp]; }
		// let multiplier = out.ingredientAmount(item) / inp.productAmount(item);
		if (swapMain) { multiplier = 1 / multiplier }
		log({ multiplier })
		if (multiplier != multiplier) debugger;
		return new CombinedRecipe({
			ingredients: out.ingredients.concat(inp.ingredients.map(i => i.multiplyBy(multiplier))),
			products: out.products.concat(inp.products.map(p => p.multiplyBy(multiplier))),
			recipes: out.recipes.concat(inp.recipes.map(r => r.multiplyBy(multiplier))),
		}).reduceItemLists().reduceRecipeList();
	}

	combine(item, inp) {
		return CombinedRecipe.combine(item, this, inp);
	}
}

// CombinedRecipe => FixedRecipe => => MultipliedRecipe => ModuledRecipe








function recipe_prepare() {

	// only enabled for now TODO FIXME

	/** @type {Object.<string, Item>} */
	let itemd = globalThis.itemd = {};
	/** @type {Object.<string, RawRecipe>} */
	let reciped = globalThis.reciped = {};

	let enabledRecipes = game.forces[gameForce].recipes._values().filter(e => e.enabled);
	let enabledIngredients = enabledRecipes.map(e => [e.ingredients, e.products]).flat(2);

	for (let rc of enabledRecipes) {
		reciped[rc.name] = RawRecipe.fromRaw(rc);
	}

	for (let rc of Object.values(reciped)) {
		for (let i of rc.ingredients) {
			if (!i.item.rawUsedIn.includes(rc)) {
				i.item.rawUsedIn.push(rc);
			}
			itemd[i.item.name] = i.item;
		}
		for (let p of rc.products) {
			if (!p.item.rawMadeIn.includes(rc)) {
				p.item.rawMadeIn.push(rc);
			}
			itemd[p.item.name] = p.item;
		}
	}

}






Object.assign(globalThis, {
	recipe_prepare,
	Item,
	Ingredient,
	RawProduct,
	Ingredient,
	Product,
	RecipeMeta,
	RawRecipe,
	Recipe,
	GenericRecipe,
	MulRecipe,
	CombinedRecipe,
});







