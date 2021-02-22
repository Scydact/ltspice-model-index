import { LtspiceModel } from "./ltspiceModelLogic";
import { LtspiceNumber, parseLtspiceNumber } from "./Utils.js";

type i_filterSelectorOption = {
    /**
     * Curried function that returns a fast evaluation function, 
     * which accepts either a string or a number (or any validated output).
     */
    fn: (filter: LtFilter) => (x: any) => boolean,
    /** String to display when selected. 
     * 
     * Should be a single symbol */
    display: string,
    /**
     * Specifies the first filter parameter description and text validator.
     */
    val?: {
        /** Short description of this input. */
        description: string,
        /** 
         * Validator that runs when typing on the input. 
         * 
         * - str is the feedback string (which will replace the input when the user is done typing.)
         * - val is the processed input that gets stored inside inputs: { val }
         */
        validator: (x: string) => { str: string, val: any },
        /**
         * Default value of this input.
         */
        default?: string,
    },
    /**
     * Specifies the second filter parameter description and text validator.
     */
    valB?: {
        /** Short description of this input. */
        description: string,
        /** 
         * Validator that runs when typing on the input. 
         * 
         * - str is the feedback string (which will replace the input when the user is done typing.)
         * - val is the processed input that gets stored inside inputs: { valB }
         */
        validator: (x: string) => { str: string, val: any },
        /**
         * Default value of this input.
         */
        default?: string,
    },
}
type i_filterSelectorOptionDict = {
    [k: string]: i_filterSelectorOption
};

export class LtFilter {
    node: HTMLElement;

    /** Input HTML element nodes. */
    internalNodes: {
        description: HTMLElement,
        selector: HTMLSelectElement,

        valContainer: HTMLElement,
        valDesc: HTMLElement,
        val: HTMLInputElement,

        valBContainer: HTMLElement,
        valB: HTMLInputElement,
        valBDesc: HTMLElement,

        btnContainer: HTMLElement,
        btnUp: HTMLButtonElement,
        btnDown: HTMLButtonElement,
        btnDelete: HTMLButtonElement,
    }

    /** Parsed inputs. */
    inputs = {
        selector: null as string,
        val: null as any,
        valB: null as any,
    }
    modelPropGetter: (x: LtspiceModel) => any;

    /** These functions are ran on each keypress and change event of the inputs. */
    inputValidators: {
        val?: (x: string) => { str: string, val: any },
        valB?: (x: string) => { str: string, val: any },
    }

    /** Filter modes available for the selector. */
    filterSelectorModes: i_filterSelectorOptionDict;

    /** Returns the filter function */
    getFilter(): (x: LtspiceModel) => boolean {
        let x = this.inputs.selector,
            y = this.filterSelectorModes[x];

        if (y) return (model) => y.fn(this)(this.modelPropGetter(model));
        else return () => true;
    }

    selectorChange() {
        let newFilterKey = this.internalNodes.selector.value,
            newFilter = this.filterSelectorModes[newFilterKey];
        if (newFilter) {
            let { display, val, valB } = newFilter;
            this.inputs.selector = newFilterKey;
        }
    }

    constructor(
        filterModes: 'string' | 'number' | i_filterSelectorOptionDict,
        modelPropGetter: (model: LtspiceModel) => any,
        description: string = '',
        val1: string = '',
        val2: string = '',
    ) {
        this.modelPropGetter = modelPropGetter;

        this.node = document.createElement('div');
        this.node.classList.add('filter-container');

        this.internalNodes = {
            description: document.createElement('div'),
            selector: document.createElement('select'),

            valContainer: document.createElement('div'),
            valDesc: document.createElement('label'),
            val: document.createElement('input'),

            valBContainer: document.createElement('div'),
            valB: document.createElement('input'),
            valBDesc: document.createElement('label'),

            btnContainer: document.createElement('div'),
            btnUp: document.createElement('button'),
            btnDown: document.createElement('button'),
            btnDelete: document.createElement('button'),
        }

        let IN = this.internalNodes;
        IN.val.value = val1;
        IN.valB.value = val2;

        $(this.node)
            .append($(IN.description).addClass('filter-description'))
            .append($(IN.selector).addClass('filter-selector'))
            .append(
                $(IN.valContainer)
                    .append(IN.valDesc)
                    .append(IN.val)
                    .addClass('filter-input-container')
            )
            .append(
                $(IN.valBContainer)
                    .append(IN.valBDesc)
                    .append(IN.valB)
                    .addClass('filter-input-container')
            )
            .append(
                $(IN.btnContainer)
                    .append($(IN.btnDelete).addClass('btn').text('×'))
                    .append($(IN.btnUp).addClass('btn').text('▴'))
                    .append($(IN.btnDown).addClass('btn').text('▾'))
                    .addClass('btn-container')
            )

        // Add event listeners and other parameters.
        IN.description.innerHTML = description.split('\n').join('<br>');

        if (filterModes === 'number') {
            this.filterSelectorModes = { ...DEFAULT_SELECTOR_FN_NUMBER };
        } else if (filterModes === 'string') {
            this.filterSelectorModes = { ...DEFAULT_SELECTOR_FN_STRING };
        } else {
            this.filterSelectorModes = { ...filterModes };
        }

        IN.selector
            .addEventListener('change', this.evtSelectorUpdate);
        // Calling the custom event this way, instead of inside each evt-x-Update()
        // avoids having duplicate events.
        IN.selector
            .addEventListener('change',
                () => this.node.dispatchEvent(this.createEventChange()), false);

        IN.val
            .addEventListener('change', this.evtValUpdate);
        IN.val
            .addEventListener('change', () => this.node.dispatchEvent(this.createEventChange()), false);

        IN.valB
            .addEventListener('change', this.evtValBUpdate);
        IN.valB
            .addEventListener('change', () => this.node.dispatchEvent(this.createEventChange()), false);

        IN.btnUp
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventMove(-1)), false);
        IN.btnDown
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventMove(1)), false);
        IN.btnDelete
            .addEventListener('click', () => this.node.dispatchEvent(this.createEventDelete()), false);

        this.reloadSelectors();
    }

    // Events
    createEventChange = () => {
        return new CustomEvent('change', {
            detail: {
                filter: this,
                ...this.inputs
            }
        });
    }

    createEventMove = (direction: number) => new CustomEvent('move', {
        detail: {
            filter: this,
            direction,
        }
    });

    createEventDelete = () => new CustomEvent('delete', {
        detail: {
            filter: this,
        }
    });

    /** Reloads selectors from this.filterFunctions */
    reloadSelectors() {
        let selector = this.internalNodes.selector;
        $(selector).empty();

        for (let key in this.filterSelectorModes) {
            let val = this.filterSelectorModes[key].display;
            let opt = document.createElement('option');
            opt.value = key;
            opt.innerText = val;
            selector.appendChild(opt);
        }
        selector.value = Object.keys(this.filterSelectorModes)[0];
        this.evtSelectorUpdate();
    }

    evtSelectorUpdate = () => {
        this.inputs.selector = this.internalNodes.selector.value;

        // set values visibility & text;
        const csm = this.filterSelectorModes[this.inputs.selector];
        const { valContainer, valBContainer, val, valB, valDesc, valBDesc } = this.internalNodes;
        // I wish i used React on this project... but is too late to switch.
        if (csm.val) {
            valDesc.innerText = csm.val.description || '';
            valContainer.classList.remove('hidden');
        } else {
            valContainer.classList.add('hidden');
        }
        if (csm.valB) {
            valBDesc.innerText = csm.valB.description || '';
            valBContainer.classList.remove('hidden');
        } else {
            valBContainer.classList.add('hidden');
        }
        this.evtValUpdate();
        this.evtValBUpdate();
    }

    evtValUpdate = () => {
        let key = this.inputs.selector,
            validator = this.filterSelectorModes[key].val?.validator;
        if (validator) {
            let x = validator(this.internalNodes.val.value);
            if (x) {
                this.internalNodes.val.value = x.str;
                this.inputs.val = x.val;
            }
        } else {
            //this.internalNodes.val.value = '';
            this.inputs.val = null;
        }
    }

    evtValBUpdate = () => {
        let key = this.inputs.selector,
            validator = this.filterSelectorModes[key].valB?.validator;
        if (validator) {
            let x = validator(this.internalNodes.valB.value);
            if (x) {
                this.internalNodes.valB.value = x.str;
                this.inputs.valB = x.val;
            }
        } else {
            //this.internalNodes.valB.value = '';
            this.inputs.valB = null;
        }
    }

    // Aux functions
    static toleranceValidator(s: string): { str: string, val: { type: 'abs' | 'rel', val: LtspiceNumber | number } } {
        s = s.trim();
        if (s.slice(-1) === '%') {
            let x = parseFloat(s.slice(0, -1));
            if (isNaN(x)) return null;
            return {
                str: x.toString() + '%',
                val: { type: 'rel', val: x }
            };
        } else {
            let x = parseLtspiceNumber(s);
            if (!x) return null;
            return {
                str: s, // Todo: ltspiceNumber.toString() returns number with suffix too, and remenbers original form exp (if any).
                val: { type: 'abs', val: x }
            };
        }
    }

    static ltspiceNumberValidator(s: string): { str: string, val: LtspiceNumber } {
        let x = parseLtspiceNumber(s);
        if (!x) return null;
        return {
            str: s, // Todo: ltspiceNumber.toString() returns number with suffix too, and remenbers original form exp (if any).
            val: x,
        };
    }

    static stringCaseInsensitiveValidator(s: string): { str: string, val: string } {
        return {
            str: s.trim(),
            val: s.trim().toLowerCase(),
        }
    }
}

const DEFAULT_SELECTOR_FN_NUMBER = {
    '=': {
        fn: (filter: LtFilter) => {
            let { val, valB } = filter.inputs as {
                val: LtspiceNumber,
                valB: { type: 'abs' | 'rel', val: LtspiceNumber | number }
            };
            let valMatch = val.valueOf(),
                valTol = (valB.type === 'abs') ? valB.val.valueOf() : valB.val as number;


            if (valB.type === 'abs') {
                if (valTol === 0) {
                    return (x: number) => x === valMatch;
                } else {
                    return (x: number) => Math.abs(x - valMatch) < valTol;
                }
            } else {
                return (x: number) => Math.abs(x - valMatch) < valMatch * valTol;
            }
        },
        display: '=',
        val: {
            description: 'Equal to',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'Tolerance',
            validator: LtFilter.toleranceValidator,
        },
    },
    '!=': {
        fn: (filter: LtFilter) => {
            let equalfn = filter.filterSelectorModes['='].fn(filter);
            return (x: number) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Not equal to',
            validator: LtFilter.ltspiceNumberValidator,
        },
        valB: {
            description: 'Tolerance',
            validator: LtFilter.toleranceValidator,
        },
    },
    '>=': {
        fn: (filter: LtFilter) => {
            let val = (filter.inputs.val as LtspiceNumber).valueOf();
            return (x: number) => x >= val;
        },
        display: '≥',
        val: {
            description: 'Greater than',
            validator: LtFilter.ltspiceNumberValidator,
        },
    },
    '<=': {
        fn: (filter: LtFilter) => {
            let val = (filter.inputs.val as LtspiceNumber).valueOf();
            return (x: number) => x <= val;
        },
        display: '≤',
        val: {
            description: 'Less than',
            validator: LtFilter.ltspiceNumberValidator,
        },
    },
}

export const DEFAULT_SELECTOR_FN_STRING = {
    '=': {
        fn: (filter: LtFilter) => {
            let value = filter.inputs.val as string;
            return (x: string) => {
                return (x) ? x.toLowerCase().includes(value) : false;
            };
        },
        display: '=',
        val: {
            description: 'Matches',
            validator: LtFilter.stringCaseInsensitiveValidator,
        },
    },
    '!=': {
        fn: (filter: LtFilter) => {
            let equalfn = filter.filterSelectorModes['='].fn(filter);
            return (x: number) => !equalfn(x);
        },
        display: '≠',
        val: {
            description: 'Does not match',
            validator: LtFilter.stringCaseInsensitiveValidator,
        },
    },
}

export type i_filterDefinition = {
    filter: LtFilter,
    name: string,
    description: string,
    repeat?: boolean,
    count?: number,
}

export const COMMON_FILTERS: i_filterDefinition[] = [
    {
        filter: new LtFilter(
            'string',
            (x: LtspiceModel) => x.modName,
            'Model name'),
        name: 'Model name',
        description: ' - ',
    },
];


export const COMMON_FILTERS_BY_MODEL = {
    BJT: [
        {
            name: 'BJT type',
            description: 'NPN or PNP.',
            filter: new LtFilter(
                {
                    NPN: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'NPN';
                            };
                        },
                        display: 'NPN',
                    },
                    PNP: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'PNP';
                            };
                        },
                        display: 'PNP',
                    },
                },
                (model: LtspiceModel) => model.type,
                'BJT type'
            )
        }
    ] as i_filterDefinition[],
    D: [
        // {
        //     name: 'Diode type',
        //     description: 'Filter NPN or PNP',
        //     filter: new LtFilter(
        //         {
        //             Custom: {
        //                 fn: (filter: LtFilter) => {
        //                     return (x: string) => {
        //                         return x === 'NPN';
        //                     };
        //                 },
        //                 display: 'NPN',
        //             },
        //         },
        //         (model: LtspiceModel) => model.params.type?.v.value.toString(),
        //         'Diode type'
        //     )
        // }
    ] as i_filterDefinition[],
    JFET: [
        {
            name: 'Channel Type',
            description: 'JFET channel type (NJF or PJF)',
            filter: new LtFilter(
                {
                    nchan: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'NJF';
                            };
                        },
                        display: 'N-type channel',
                    },
                    pchan: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'PJF';
                            };
                        },
                        display: 'P-type channel',
                    },
                },
                (model: LtspiceModel) => model.type,
                'Channel type'
            )
        }
    ] as i_filterDefinition[],
    MOSFET: [
        {
            name: 'Channel Type',
            description: 'JFET channel type (NMOS or PMOS)',
            filter: new LtFilter(
                {
                    nchan: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'nchan';
                            };
                        },
                        display: 'NPN',
                    },
                    pchan: {
                        fn: (filter: LtFilter) => {
                            return (x: string) => {
                                return x === 'pchan';
                            };
                        },
                        display: 'PNP',
                    },
                },
                (model: LtspiceModel) => model.mosChannel,
                'Channel type'
            )
        }
    ] as i_filterDefinition[],
}
