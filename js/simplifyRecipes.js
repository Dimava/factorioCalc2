test1 = function test1() {

	roundE8 = function roundE8(n) {
		if ((n * 1e4) % 1 ** 2 < 1e-4 || (n * 1e4) % 1 ** 2 > 1 - 1e-4)
			return Math.round(n * 1e4) / 1e4;
		return n;
	}

	cls = {
		Item: class Item {
			constructor(o) {
				Object.assign(this, o)
			}
		}
		,
		Recipe: class Recipe {
			constructor(o) {
				Object.assign(this, o)
			}
			ingredientAmount(name) {
				return this.ingredients.filter(e=>e.name == name).map(e=>e.adjustedAmount()).reduce((v,e)=>v + e, 0)
			}
			productAmount(name) {
				return this.products.filter(e=>e.name == name).map(e=>e.adjustedAmount()).reduce((v,e)=>v + e, 0)
			}
			void() {
				return this.products.length == 0 && this.ingredients.length <= 1
			}
		}
		,
		Ingredient: class Ingredient {
			constructor(o) {
				Object.assign(this, o);
				this.amount = roundE8(this.amount);
			}
			adjustedAmount() {
				return this.amount
			}
		}
		,
		Product: class Product {
			constructor(o) {
				Object.assign(this, o);
				if (this.amount)
					this.amount = roundE8(this.amount);
			}
			adjustedAmount() {
				let amount = this.amount === undefined ? (this.amount_min + this.amount_max) / 2 : this.amount;
				let probability = this.probability === undefined ? 1 : this.probability;
				return amount * probability;
			}
		}
		,
	}

	cls.MultipliedRecipe = class MultipliedRecipe extends cls.Recipe {
		constructor(recipe, amount) {
			super({});
			if (recipe instanceof MultipliedRecipe) {
				amount *= recipe.amount;
				recipe = recipe.recipe;
			}
			this.name = recipe.name;
			this.recipe = recipe;
			if (!Number.isFinite(amount))
				throw amount;
			this.amount = roundE8(amount);
			this.ingredients = this.recipe.ingredients._unique('name').map(({type, name, item})=>new cls.Ingredient({
				type,
				name,
				amount: this.recipe.ingredientAmount(name) * this.amount,
				item
			}));
			this.products = this.recipe.products._unique('name').map(({type, name, item})=>new cls.Ingredient({
				type,
				name,
				amount: this.recipe.productAmount(name) * this.amount,
				item
			}));
			this.ingredients.map(({name})=>{
				let c = Math.min(this.ingredientAmount(name), this.productAmount(name));
				if (!c)
					return;
				this.ingredients = this.ingredients.map(e=>e.name == name ? new cls.Ingredient({
					...e,
					amount: e.amount - c
				}) : e).filter(e=>e.amount);
				this.products = this.products.map(e=>e.name == name ? new cls.Product({
					...e,
					amount: e.amount - c
				}) : e).filter(e=>e.amount);
			}
			)
		}
	}
	cls.CombinedRecipe = class CombinedRecipe extends cls.Recipe {
		constructor(recipes, name) {
			super({});

			this.name = typeof name == 'string' ? name : typeof name == 'object' ? name.name : recipes[0].name;

			recipes = recipes.flatMap(e=>e.recipe instanceof CombinedRecipe ? e.recipe.recipes.map(r=>new cls.MultipliedRecipe(r,e.amount)) : e).map(e=>new cls.MultipliedRecipe(e,1));

			this.recipes = recipes._unique('name').map(e=>new cls.MultipliedRecipe(e,recipes.filter(r=>r.name == e.name).map(e=>e.amount).reduce((v,e)=>v + e, 0) / e.amount))

			this.names = this.recipes.map(e=>e.name).sort().join(' & ');
			this.ingredients = this.recipes.flatMap(e=>e.ingredients)._unique('name').map(({type, name, item})=>new cls.Ingredient({
				type,
				name,
				amount: this.recipes.map(e=>e.ingredientAmount(name)).reduce((v,e)=>v + e),
				item
			}));
			this.products = this.recipes.flatMap(e=>e.products)._unique('name').map(({type, name, item})=>new cls.Ingredient({
				type,
				name,
				amount: this.recipes.map(e=>e.productAmount(name)).reduce((v,e)=>v + e),
				item
			}));

			this.ingredients.map(({name})=>{
				let c = Math.min(this.ingredientAmount(name), this.productAmount(name));
				if (!c)
					return;
				this.ingredients = this.ingredients.map(e=>e.name == name ? new cls.Ingredient({
					...e,
					amount: e.amount - c
				}) : e).filter(e=>e.amount);
				this.products = this.products.map(e=>e.name == name ? new cls.Product({
					...e,
					amount: e.amount - c
				}) : e).filter(e=>e.amount);
			}
			)
		}
	}

	simple = {
		item: {},
		recipe: {},
		group: {},
	}

	for (let pump of game.entity_prototypes._values().filter(e=>e.type == 'offshore-pump')) {
		game.player.force.recipes['pumping--' + pump.name] = Object.assign(new luaClassList.LuaRecipe(), {
			category: pump.name,
			enabled: true,
			energy: 1,
			hidden: false,
			ingredients: [],
			name: pump.name,
			object_name: "LuaRecipe",
			products: [{
				type: 'fluid',
				name: pump.fluid.name,
				probability: 1,
				amount: pump.pumping_speed * 60,
			}],
			prototype: {
				main_product: pump.fluid,
			},
		});
	}

	recipes = game.player.force.recipes._values().filter(e=>e.enabled).map(({name, category, order, energy, ingredients, products, prototype, _icon, group, subgroup, })=>new cls.Recipe({
		name,
		category,
		/*order,*/
		energy,
		ingredients: ingredients._values().map(e=>new cls.Ingredient(e)),
		products: products.slice().map(e=>new cls.Product(prototype.main_product?.name != e.name ? e : {
			...e,
			main: true
		})),
		// 	_icon,
		// 	main_product: prototype.main_product,
		// 	group, subgroup,
	})).map(e=>new cls.MultipliedRecipe(e,1))

	// recipes

	items = recipes.map(e=>[e.ingredients._values(), e.products]).flat(2).map(e=>e.name)._unique().map(e=>game.item_prototypes[e] || game.fluid_prototypes[e]).map(({name=null.null, group, subgroup, type, fuel_value, })=>new cls.Item({
		name,
		/*group, subgroup,*/
		type: type || (game.fluid_prototypes[name] && 'fluid') || null.null,
		/*fuel_value,*/
		used_in: [],
		made_in: [],
	}))

	simple.item = Object.fromEntries(items.map(e=>[e.name, e]))
	simple.item._values().map(e=>simple.item[e.name.replace(/[- ]/g, '_')]=e)
	simple.recipe = Object.fromEntries(recipes.map(e=>[e.name, e]))

	recipes.map(r=>{
		r.ingredients.map(i=>{
			i.item = simple.item[i.name];
			if (!r.void()) {
				i.item.used_in.push(r);
			} else if (r.ingredients.length == 1 && r.products.length == 0) {
				i.item.voidable = true;
			}
		}
		);
		r.products.map(i=>{
			i.item = simple.item[i.name];
			if (!r.void()) {
				i.item.made_in.push(r);
			}
		}
		);
	}
	)
	recipes.map(r=>{
		r.recipe.ingredients.map(i=>{
			i.item = simple.item[i.name];
		}
		);
		r.recipe.products.map(i=>{
			i.item = simple.item[i.name];
		}
		);
	}
	)
	
	items.map(e=>e.base_used_in = e.used_in.map(e=>e.recipe))
	items.map(e=>e.base_made_in = e.made_in.map(e=>e.recipe))

	recipes

	log('test1')
}

// test1()
function test2() {

	// items.map(e=>e.all_made_in = e.made_in.slice())
	// items.map(e=>e.all_used_in = e.used_in.slice())

	// a = items.filter(e=>e.used_in.length == 1 && e.made_in.length == 1)

	// for (let i of a) {
	// 	let r_made_in = i.made_in[0];
	// 	let r_used_in = i.used_in[0];
	// 	let mul = 0;
	// 	for (let ing of r_used_in.ingredients) {
	// 		let used_amount = r_used_in.ingredientAmount(ing.name);
	// 		let made_amount = r_made_in.productAmount(ing.name);
	// 		if (used_amount && made_amount) {
	// 			mul = Math.max(mul, used_amount / made_amount);
	// 		}
	// 	}
	// 	let combined_recipe = new cls.CombinedRecipe([
	// 		new cls.MultipliedRecipe(rin, 1),
	// 		new cls.MultipliedRecipe(uin, mul),
	// 	])
	// 	log(combined_recipe);
	// }


	a = items.filter(e=>e.used_in.length == 0 && e.made_in.length == 1 && e.made_in[0].ingredients.find(e=>e.item.made_in.length == 1))
	// a = [simple.item["angels-plate-chrome"]]
	// a = [simple.item["sapphire-5"]]
	// .slice(0,1)
	a = items;

	for (let n = 0; n < 100; n++) {

		condition = e=>e.made_in.length == 1 && e.made_in[0].ingredients.find(e=>e.item.made_in.length == 1)
		r_condition = r_made_in=>r_made_in.ingredients.find(e=>e.item.made_in.length == 1)

		// 	a = items.filter(condition)
		a = items.filter(e=>e.made_in.find(r_condition))
		for (let i of a) {
			// 		if (!condition(i)) continue;
			for (let r1 of i.made_in) {
				if (!r_condition(r1))
					continue;
				let r_used_in = r1;
				let j = r_used_in.ingredients.map(e=>e.item).find(e=>e.made_in.length == 1);
				let r_made_in = j.made_in[0];
				let mul = r_used_in.ingredientAmount(j.name) / r_made_in.productAmount(j.name);
				let combined_recipe = new cls.CombinedRecipe([new cls.MultipliedRecipe(r_made_in,mul), new cls.MultipliedRecipe(r_used_in,1)],r_used_in.name);

				i.made_in = i.made_in.filter(r=>r != r_used_in);
				if (combined_recipe.void())
					continue;

				i.made_in.push(combined_recipe)
				// 	j.used_in = j.used_in.filter(r => r != r_used_in);
				combined_recipe.ingredients.map(e=>e.item.used_in.push(combined_recipe));
				// combined_recipe.products.map(e=>e.item.made_in.push(combined_recipe));
				// 	log(r = {i, j, mul, r_used_in, r_made_in, combined_recipe});
			}
		}
		log(n, a)
		if (!a.length)
			break;
	}

	// remove negative loops
	for (let i of items) {
		i.made_in = i.made_in.filter(r=>r.productAmount(i.name))
	}

	// // change recipes to updated combined ones
	recipes = items.flatMap(e=>e.made_in)._unique(e=>e.names || e.name || null.null)
	items.map(e=>e.used_in = [])
	recipes.map(r=>r.ingredients.map(i=>i.item.used_in.push(r)))

	log('test2')

}

// test2();
function test3() {

	// test2()

	powerCost = {}

	for (let pump of game.entity_prototypes._values().filter(e=>e.type == 'offshore-pump')) {
		powerCost[pump.name] = 0;
	}

	powerCost

	for (let assembler of game.entity_prototypes._values().filter(e=>e.type == 'assembling-machine' || e.type == 'furnace' || e.type == 'rocket-silo')) {
		// 	log(assembler.name, assembler.crafting_categories, roundE8(assembler.energy_usage*60/1000 / assembler.crafting_speed))

		let eff = roundE8(assembler.energy_usage * 60 / 1000 / assembler.crafting_speed);
		for (let category in assembler.crafting_categories) {
			if (!powerCost[category] || powerCost[category] < eff) {
				powerCost[category] = eff;
			}
		}

	}

	for (let category in game.entity_prototypes.character.crafting_categories) {
		if (!powerCost[category]) {
			powerCost[category] = 1e6;
		}
	}

	powerCost

	cls.Recipe.prototype.powerCost = function() {
		return powerCost[this.category] * this.energy
	}
	cls.MultipliedRecipe.prototype.powerCost = function() {
		return this.amount * this.recipe.powerCost()
	}
	cls.CombinedRecipe.prototype.powerCost = function() {
		return this.recipes.map(e=>e.powerCost()).reduce((v,e)=>v + e, 0)
	}

	powerCost

	log('test3')

}
function test4() {

	recipes.map(e=>e._rpcost = e.powerCost())

	recipes

	items.map(e=>e._some_cost = Infinity)

	cls.Recipe.prototype.someCost = function() {
		return this._rpcost + this.ingredients.map(e=>e.item._some_cost * e.amount).reduce((v,e)=>v + e, 0)
	}

	game.entity_prototypes._values().filter(e=>e.type == 'tree').map(e=>e.mineable_properties.products).flat().map(e=>simple.item[e.name]).map(e=>e._some_cost = Math.min(e._some_cost, 1e6))

	round4 = n=>{
		let m = 1;
		while (m < n)
			m *= 10;
		m /= 1e4;
		return roundE8(Math.floor(n / m) * m);
	}

	for (let n = 0; n < 100; n++) {
		for (let r of recipes) {
			let cost = r.someCost();
			if (Number.isFinite(cost)) {
				for (let p of r.products) {
					let prev = p.item._some_cost
					let next = round4(cost / p.amount);
					if (next < prev) {
						p.item._some_cost = next;
						// 					(n % 10 == 0) && 
						console.log(`%d|  %o, %f > %f`, n, p.item, prev, p.item._some_cost);
					}
				}
			}
		}

		// 	(n % 10 == 0) && log(n)
	}

	log('test4')

}
// simple.item._values().map(e=>simple.item[e.name.replace(/[- ]/g, '_')]=e)

function test5() {

	for (let assembler of game.entity_prototypes._values().filter(e=>e.type == 'assembling-machine' || e.type == 'furnace' || e.type == 'rocket-silo')) {
		// 	log(assembler.name, assembler.crafting_categories, roundE8(assembler.energy_usage*60/1000 / assembler.crafting_speed))

		let eff = roundE8(assembler.energy_usage * 60 / 1000 / assembler.crafting_speed);
		let item = simple.item[assembler.items_to_place_this[0].name]
		if (!item || !Number.isFinite(item._some_cost))
			continue;
		let box = assembler.selection_box;
		let size = 2 * (box.right_bottom.x - box.left_top.x) * (box.right_bottom.y - box.left_top.y)
		log('%o|  %s: %f += %f + %f', assembler.crafting_categories, assembler.name, eff, round4(item._some_cost / 3600), round4(size * simple.item.landfill_sand_3._some_cost / 3600))

	}

	log('test5')
}
