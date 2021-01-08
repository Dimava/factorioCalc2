




r = reciped.accumulator
r = reciped["biter-medium-keeping"]

g = q('#ced') || elm('#ced').appendTo('body')
g.contentEditable = true

g = q('.test0') || elm('.test0').appendTo('body')
g.innerText = '';











function IconElement(e, size=32) {
	let icon = e.getIcon()[size];
// 	log(icon)
	return elm(`icon.icon.icon-${size}[title=${e.name}][style=background-image:url(${icon.src});background-position:${-icon.x}px ${-icon.y}px;]`);
}

function IngredientElement(i, r) {
	return elm(`.re-ingredient[entry-type=${i.item.type}][entry-name=${i.item.name}]`, 
		elm('.re-ingredient-icon', IconElement(i, 16)),
		elm('.re-ingredient-amount', amountText(r.ingredientAmount(i.item))),
		click => MakeIngredientRecipeChooser(click, i),
	)
}
function ProductElement(p, r) {
	return elm(`.re-product[entry-type=${p.item.type}][entry-name=${p.item.name}]`, 
		elm('.re-product-icon', IconElement(p, 16)),
		elm('.re-product-amount', amountText(r.productAmount(p.item))),
		click => MakeProductRecipeChooser(click, p),
	)
}

function RecipeElement(r) {
	return elm(`.re-recipe[entry-type=recipe][entry-name=${r.name}]`, 
		elm('.re-products', ...r.products._unique('name').map(p => ProductElement(p, r))),
		elm('.re-recipe-recipe', 
			elm('.re-recipe-recipe-icon', IconElement(r, 32)),
		),
		elm('.re-ingredients', ...r.ingredients._unique('name').map(i => IngredientElement(i, r))),
	)
}

function RecipeHolder(r) {
	return elm('.re-holder',
		elm('.re-children-consumer'),
		RecipeElement(r),
		elm('.re-children-producer'),
		contextmenu => contextmenu.preventDefault() + contextmenu.target.closest('.re-holder').remove()
	)
}

function RecipeSampleElement(r) {
	return elm(`.re-recipe.re-minify[entry-type=recipe][entry-name=${r.name}]`,
		elm('.re-products.re-minify', 
			...r.products.map(p => 
				elm('.re-product.re-minify', elm('.re-product-icon', IconElement(p.item, 16)))
			)
		),
		elm('.re-recipe-recipe.re-minify', 
			elm('.re-recipe-recipe-icon', IconElement(r, 32)),
		),
		elm('.re-ingredients.re-minify', 
			...r.ingredients.map(i => 
				elm('.re-ingredient.re-minify', elm('.re-ingredient-icon', IconElement(i.item, 16)))
			)
		),
	)
}

function RecipeSampleHolder(r) {
	return elm('.re-holder.re-minify-holder',
		RecipeSampleElement(r),
		click => {
			let parent = click.target.closest('.re-holder').parentNode;
			let holders = parent.qq('.re-minify-holder')
			click.target.closest('.re-holder').replaceWith(RecipeHolder(r));
			log(parent)
			for (let c of holders) {
				log(c, c.parentNode)
				if (c.matches('.re-minify-holder')) {
					c.remove();
				}
			}
		},
		contextmenu => contextmenu.preventDefault() + 
			[...contextmenu.target.closest('.re-holder').parentNode.children].map(e=>e.matches('.re-minify-holder') && e.remove()),
	)
}

g.replaceWith(
	elm('.test0', 
		'left click item to add recipes (both ways)', elm('br'),
		'right click recipe to delete', elm('br'),
		'left click small to choose if a lot of them', elm('br'),
		elm('button.ns-reverse', 'reverse', click => q('.test0').classList.toggle('re-reverse')),
		elm('br'),
		elm('.test1',
			RecipeHolder(r)
		)
	)
)





function MakeIngredientRecipeChooser(event, i) {
	log({event, i})
	let holder = event.target.closest('.re-holder');
	let childContainer = [...holder.children].find(e=>e.matches('.re-children-producer'));
	let it = i.item;
	if (it.rawMadeIn.length <= 3) {
		for (let r of it.rawMadeIn) {
			childContainer.append(RecipeHolder(r))
		}
	} else {
		for (let r of it.rawMadeIn) {
			childContainer.append(RecipeSampleHolder(r))
		}
	}
}

function MakeProductRecipeChooser(event, p) {
	log({event, p})
	let holder = event.target.closest('.re-holder');
	let childContainer = [...holder.children].find(e=>e.matches('.re-children-consumer'));
	let it = p.item;
	if (it.rawUsedIn.length <= 3) {
		for (let r of it.rawUsedIn) {
			childContainer.append(RecipeHolder(r))
		}
	} else {
		for (let r of it.rawUsedIn) {
			childContainer.append(RecipeSampleHolder(r))
		}
	}
}