import { arraysEqual, createElement, createRadio, parseLtspiceNumber, setWindow } from "./Utils.js";
import * as d from "./ltspiceModelParser.js";
import * as p from "./StrParse.js";
import { DEFAULT_MODELS, DEFAULT_PARAMETERS, MODEL_TYPES } from "./ltspiceDefaultModels.js";
import { getModelDb, getModelsByType, getModelsDict, getParameterAnalitics, LtspiceModel, i_modelPack, joinDb, parseModelDb, getParam } from "./ltspiceModelLogic.js";

declare const $: JQueryStatic;

/** 
 * List of packs loaded from ./data/models.json. 
 * Gets merged with any custom packs made/loaded from the user's PC.
 * */
let DB_PACKS: i_modelPack[] = [];

/** Constants to be used globally inside the app. */
const APP = {
    /** Selected app model type (mode). [BJT, D, JFET, MOSFET] */
    mode: 'BJT' as keyof typeof MODEL_TYPES,
    /** Loaded model pack definitions. */
    packs: [] as i_modelPack[],
    /** All the loaded models. */
    modelList: [] as LtspiceModel[],
    /** HTML nodes used globally in the app. */
    nodes: {
        mainTableContainer: document.createElement('div'),
    },
    /** Dict where each key is a MODEL TYPE (BJT, MOSFET, D, JFET), containing a list of all the models of that kind. */
    modelsByType: {} as { [key: string]: LtspiceModel[] },
    /** Dict where each key is a model name, and each value is a possible model name. */
    modelsByName: {} as { [key: string]: LtspiceModel[] },
    /** 
     * Probably the list that will be used the most. 
     * Object that, for each type (BJT, D, MOSFET, JFET), contains a single model definition for every single model,
     * sorted in order of priority (update pack priority to change!).
     */
    modelsByTypeByName: {} as { [key: string]: { [key: string]: LtspiceModel } },
    /** Dict where each key is a MODEL TYPE, and each value has statistic about each parameter used on it. */
    paramStatsByModelType: {} as { [key: string]: ReturnType<typeof getParameterAnalitics> }
};

setWindow({
    p,
    getModelDb,
    parseModelDb,
    joinDb,
    APP,
});

window.addEventListener('load', function () {
    document.getElementById('file-input')
        .addEventListener('change', readSingleFile, false);
    init(document.getElementById('main'));

    getModelDb().then((r) => {
        DB_PACKS = parseModelDb(r);
        rebuildPacks();
        populateTable();
    })
});

function rebuildPacks() {
    // TODO: Custom pack support would go here (APP.packs = [...parseModeDb, ...customPacks]);
    APP.packs = [...DB_PACKS];
    APP.modelList = joinDb(APP.packs);
    APP.modelsByType = getModelsByType(APP.modelList);
    APP.modelsByName = getModelsDict(APP.modelList);
    APP.modelsByTypeByName = Object.fromEntries(
        Object.entries(APP.modelsByType)
            .map(x => [
                x[0],
                Object.fromEntries(
                    Object.entries(getModelsDict(x[1]))
                        .map(y => [y[0], y[1][0]])
                )
            ])
    );
    APP.paramStatsByModelType = Object.fromEntries(
        Object.entries(APP.modelsByTypeByName)
            .map(x => [x[0], getParameterAnalitics(Object.values(x[1]))])
    );
}

setWindow({ parseLtspiceNumber, getParam });


function init(mainNode) {
    const $mainNode = $(mainNode).empty();

    // Create mode selection thing 
    {
        let container = createElement(mainNode, 'div', null, ['select-mode-container']);
        createElement(container, 'h4', 'Tipos de modelos:');
        let d = createElement(container, 'form', null, ['select-mode']);

        for (const type in MODEL_TYPES) {
            let fn = () => {
                APP.mode = type as any;
                // todo: update_tables()?
                populateTable();
            };
            let selected = APP.mode === type;
            createRadio(d, 'userSelect', type, fn, selected);
        }

        mainNode.appendChild(container);
    }

    // Main table init
    {
        let { mainTableContainer } = APP.nodes;
        mainTableContainer.id = 'mainTableContainer';
        mainNode.appendChild(mainTableContainer);
    }
}

function populateTable() {
    const tbl = document.createElement('table');

    const thead = tbl.createTHead();
    const rhead = thead.insertRow();
    rhead.insertCell().innerText = 'Model name';
    rhead.insertCell().innerText = 'Library';
    rhead.insertCell().innerText = 'Type';

    for (const x of DEFAULT_PARAMETERS[APP.mode]) {
        rhead.insertCell().innerText = x;
    }

    rhead.insertCell().innerText = 'Model definition';

    const tbody = tbl.createTBody();

    const currModels = APP.modelsByTypeByName[APP.mode];
    const dictGetTypeParameter = {
        BJT: (model: LtspiceModel) => model.type,
        JFET: (model: LtspiceModel) => model.type,
        D: (model: LtspiceModel) => model.params.type?.v.value.toString(),
        MOSFET: (model: LtspiceModel) => model.mosChannel,
    }
    const getTypeParam = dictGetTypeParameter[APP.mode];
    const modelEntries = Object.entries(currModels);
    const meLen = modelEntries.length;
    for (let i = 0; i < Math.min(meLen, 2000); ++i) {
        const [modelName, model] = modelEntries[i];
        let r = tbody.insertRow();
        r.insertCell().innerText = modelName;
        r.insertCell().innerText = model.src.pack;
        r.insertCell().innerText = getTypeParam(model);

        for (const x of DEFAULT_PARAMETERS[APP.mode]) {
            r.insertCell().innerText = model.params[x]?.v.toString();
        }

        r.insertCell().innerText = model.src.line;
    }


    // Replace old table
    const { mainTableContainer } = APP.nodes;
    $(mainTableContainer).empty();
    mainTableContainer.appendChild(tbl);
}






































/** Some file input function??? */
function readSingleFile(e: any) {
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
function displayContents(contents: string | ArrayBuffer) {
    if (contents) {
        var element = document.getElementById('file-content');
        element.textContent = contents.toString();
    }
}