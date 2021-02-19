import { createElement, createRadio, setWindow } from "./Utils.js";
import * as p from "./StrParse.js";
import { getModelDb, joinDb, MODEL_TYPES, parseModelDb } from "./ltspiceModelLogic.js";
setWindow({
    p,
    getModelDb,
    parseModelDb,
    joinDb,
});
window.addEventListener('load', function () {
    document.getElementById('file-input')
        .addEventListener('change', readSingleFile, false);
    init(document.getElementById('main'));
    getModelDb().then((r) => {
        DB_PACKS = parseModelDb(r);
        rebuildPacks();
    });
});
function rebuildPacks() {
    // TODO: Custom pack support would go here (APP.packs = [...parseModeDb, ...customPacks]);
    APP.packs = [...DB_PACKS];
    APP.modelList = joinDb(APP.packs);
}
let DB_PACKS = [];
const APP = {
    mode: 'BJT',
    packs: [],
    modelList: [],
};
setWindow({ APP });
function init(node) {
    const $node = $(node);
    $node.empty();
    // Create mode selection thing 
    {
        let container = createElement(node, 'div', null, ['select-mode-container']);
        createElement(container, 'h4', 'Tipos de modelos:');
        let d = createElement(container, 'form', null, ['select-mode']);
        for (const type in MODEL_TYPES) {
            let fn = () => {
                APP.mode = type;
                // todo: update_tables()?
            };
            let selected = APP.mode === type;
            createRadio(d, 'userSelect', type, fn, selected);
        }
        node.appendChild(container);
    }
}
function readSingleFile(e) {
    var file = e.target.files[0];
    setWindow('files', e.target.files);
    if (!file) {
        return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
        var contents = e.target.result;
        displayContents(contents);
    };
    reader.readAsText(file);
}
function displayContents(contents) {
    if (contents) {
        var element = document.getElementById('file-content');
        element.textContent = contents.toString();
    }
}
//# sourceMappingURL=main.js.map