import "./3_vue_components.js";


Vue.components['pl-grid'] = {
	props: ['recipes'],
	template: `
		<div class="pl-grid">
			<pl-row v-for="recipe of recipes" :recipe="recipe" />
		</div>
	`,
}

Vue.components['pl-row'] = {
	data: () => ({ unwrap: false }),
	props: ['recipe'],
	template: `
		<div class="pl-row">
			<div class="pl-recipe-list" @click="unwrap=!unwrap">
				<pl-recipe :recipe="recipe" />
			</div>
			<div class="pl-ingredient-list">
				<pl-ingredient v-for="ingredient of recipe.ingredients" :ingredient="ingredient" />
			</div>
			<div class="pl-product-list">
				<pl-product v-for="product of recipe.products" :product="product" />
			</div>
		</div>
		<div class="pl-subrow" v-if="unwrap && recipe.recipes">
			<pl-row v-for="r of recipe.recipes" :recipe="r" />
		</div>
	`,
}

Vue.components['pl-cell'] = {
	props: ['item', 'icon', 'amount', 'title'],
	computed: {
		my_amount() {
			return this.amount
				?? this.item?.adjustedAmount?.()
				?? this.item?.amount
				?? '\xa0';
		},
	},
	template: `
		<div class="pl-cell">
			<icon :icon="icon" :title="title" />
			<pl-amount :amount="my_amount" />
		</div>
	`,
}

Vue.components['pl-cell-list'] = {
	props: ['list', 'classes', 'child-classes'],
	template: `
		<div class="pl-cell-list" :class="classes">
			<pl-cell v-for="item of list" :class="child-classes" />
		</div>
	`,
}

Vue.components['pl-recipe'] = {
	props: ['recipe'],
	template: `
		<div class="pl-recipe">
			<icon :item="recipe"/>
			<pl-amount :amount="recipe.desc || '&nbsp;'" />
		</div>
	`,
}
Vue.components['pl-ingredient'] = {
	props: ['ingredient'],
	template: `
		<div class="pl-ingredient">
			<icon :item="ingredient.item"/>
			<pl-amount :amount="ingredient.adjustedAmount()" />
		</div>
	`,
}
Vue.components['pl-product'] = {
	props: ['product'],
	template: `
		<div class="pl-product">
			<icon :item="product.item"/>
			<pl-amount :amount="product.adjustedAmount()" />
		</div>
	`,
}

Vue.components['pl-amount'] = {
	props: ['amount'],
	computed: {
		amountText() {
			return window.amountText(this.amount);
		},
	},
	template: `
		<div class="pl-amount">
			{{ amountText }}
		</div>
	`,
}

