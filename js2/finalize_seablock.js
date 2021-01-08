import "./0_parse_game_files.js";
import "./1_load_raw_game.js";
import "./1_make_icons.js";
import "./2_recipe_view.js";
import "./3_vue_components.js";
import "./3_vue_recipe_explorer.js";
import "./3_vue_production_line.js";
import "./3_vue_selector.js";

// nw.w = nw.Window.get()
// nw.w.showDevTools()

// globalThis.gameName = 'vanilla';
globalThis.gameName = 'seablock';
// globalThis.gameName = 'spaceexp';
// globalThis.gameName = 'indrev';

// if (localStorage.gameName) {
// 	globalThis.gameName = localStorage.gameName;
// }
// if (localStorage.tmpGameName) {
// 	globalThis.gameName = localStorage.tmpGameName;
// 	localStorage.tmpGameName = '';
// }






globalThis.gameForce = 'player';
// globalThis.gameForce = 'neutral';

console.time('loading');

void async function (){

await load_raw_game();

await make_icons();

await paint_icons();

await recipe_prepare();

await Selector.runTest();

console.timeEnd('loading');

}()
