import "./3_vue_components.js";
import "./3_vue_recipe_explorer.js";

class SelectorSubGroup {
	constructor(o) {
		Object.assign(this, o);
	}
	static fromRaw(r, g) {
		return new SelectorSubGroup({
			name: r.name,
			order: r.order,
			allItems: [],
			icon: IconSource.getByName(`item-subgroup.${r.name}`),
			empty: false,
			filtered: [],
		});
	}
	add(r) {
		this.allItems.push(r);
	}
	sort() {
		this.allItems.sort((a,b)=>a.order > b.order ? 1 : -1);
	}
	updateType(type) {
		this.items = this.allItems.filter(e=>e.type == type);
		this.update('');
	}
	update(filter) {
		if (!filter) {
			this.filtered = this.allItems;
		} else {
			this.filtered = this.allItems.filter(e=>e.name.includes(filter));
		}
		this.empty = !this.filtered.length;
	}
}

class SelectorGroup {
	constructor(o) {
		Object.assign(this, o);
		this.subgroups.sort((a,b)=>a.order > b.order ? 1 : -1);
	}
	static fromRaw(r) {
		return new SelectorGroup({
			name: r.name,
			order: r.order,
			order_in_recipe: r.order_in_recipe,
			subgroups : r.subgroups.map(e => SelectorSubGroup.fromRaw(e, this)),
			icon: IconSource.getByName(`item-group.${r.name}`),
			empty: false,
			filtered: [],
		});
	}
	updateType(type) {
		for (let sg of this.subgroups) {
			sg.updateType(type);
		}
		this.update('');
		this.typeEmpty = this.empty;
	}
	update(filter) {
		for (let sg of this.subgroups) {
			sg.update(filter);
		}
		this.filtered = this.subgroups.filter(e=>!e.empty);
		this.empty = this.filtered.length == 0;
	}
} 

class Selector {
	constructor() {
		this.groups = Object.values(game.item_group_prototypes).map(SelectorGroup.fromRaw);
		this.groupd = Object.fromEntries(this.groups.map(e=>[e.name,e]));
		this.groups.sort((a,b)=>a.order > b.order ? 1 : -1);
		this.subgroupd = Object.fromEntries(this.groups.flatMap(e=>e.subgroups).map(e=>[e.name, e]));

		for(let r of Object.values(reciped)) {
			this.subgroupd[r.meta.subgroup] ?? log(r, r.meta.subgroup)
			this.subgroupd[r.meta.subgroup]?.add(r);
		}
		for (let sg of Object.values(this.subgroupd)) {
			sg.sort();
		}
		this.update('');
	}
	update(filter) {
		for (let g of this.groups) {
			g.update(filter);
		}
	}
}


Vue.components['gs-root'] = {
	data(){return {filter:'',group:'combat'}},
	props: ['selector', 'root'],
	emits: ['up'],
	methods: {
		up(bubble) {
			this.$forceUpdate();
			this.$emit('up', bubble);
		},
		refilter() {
			this.selector.update(this.filter);

			this.up();
		},
		selectItem(item) {
			this.root.explore.addIntoRoot(item);
			log(this.root.explore.$vm)
			this.root.explore.$vm?.up();
		},
	},
	created(){
		log('created gs-root')
	},
	template: `
		<div class="gs-root -debug-outline">cc
			<div class="gs-filter-holder">
				<input class="gs-filter" v-model="filter" @change="refilter" />
			</div>
			<div class="gs-group-holder">
				<div class="gs-group" v-for="g of selector.groups"
						:class="{'gs-empty':g.empty}" @click="!g.empty&&(group=g.name)">
					<icon :icon="g.icon" :size="64"/>
				</div>
			</div>
			<div class="gs-subgroup-holder"> {{ group }}
				<div class="gs-subgroup" v-if="selector.groupd[group]"
						v-for="subgroup of selector.groupd[group].filtered"> {{ subgroup.name }}
					<div class="gs-item" v-for="item of subgroup.filtered" @click="selectItem(item)">
						<icon :item="item" :size="32"/>
					</div>
				</div>
			</div>
		</div>
	`,
}


Selector.runTest = function() {
	globalThis.root = {
		selector: new Selector(),
		explore: ExploredRecipe.makeSampleRoot(),
	};
	makeApp(root)(`
		<re-root :explore="root.explore"></re-root>
		<gs-root :selector="root.selector" :root="root"></gs-root>
		<root v-if="root" :root="root"></root>
		<div contenteditable="true">text</div>
	`);
}


Object.assign(globalThis, {
	Selector,
	SelectorGroup,
	SelectorSubGroup,
});