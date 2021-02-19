// Typescript adaptation from
// https://github.com/LowLevelJavaScript/Parser-Combinators-From-Scratch/blob/master/episode-4/index.js


export const updateParserState = (state: i_ParserState, index: number, result) => ({
    ...state,
    index,
    result
} as i_ParserState);

export const updateParserResult = (state: i_ParserState, result) => ({
    ...state,
    result
} as i_ParserState);

export const updateParserError = (state: i_ParserState, errorMsg: string) => ({
    ...state,
    isError: true,
    error: errorMsg
} as i_ParserState);

interface i_ParserState {
    /** Current index being parsed on the given target. */
    index: number,
    /** Result of the parser. */
    result: any,
    /** Error object, if the parser returned an error. */
    error: any,
    /** If true, the parser returned an error. */
    isError: boolean,
    /** The target that the parser must parse. */
    target: any,
    /** Used for debug purposes? */
    _debug?: boolean,
    [key: string]: any,
}

const initialState = {
    target: '',
    index: 0,
    result: null,
    isError: false,
    error: null
} as i_ParserState;

export class Parser {
    parserStateTransformerFn: (parserState: i_ParserState) => i_ParserState;

    constructor(parserStateTransformerFn: (parserState: i_ParserState) => i_ParserState) {
        this.parserStateTransformerFn = parserStateTransformerFn;
    }

    run(target, _debug = false) {
        let runObj = { ...initialState, target };
        if (_debug) {
            runObj._debug = _debug;
            debugger;
        };
        return this.parserStateTransformerFn(runObj);
    }

    /**
     * Transforms the result using the given function.
     * 
     * Similar to Array.map, updates the result by applying fn() to it.
     */
    map(fn: (result) => any) {
        return new Parser(parserState => {
            const nextState = this.parserStateTransformerFn(parserState);

            if (nextState.isError) return nextState;

            return updateParserResult(nextState, fn(nextState.result));
        });
    }

    /**
     * Allows contextual parsing by allowing to 
     * choose a new parser according to this parser's result.
     * 
     * Similar to Array.map, runs the parser returned by fn(result).
     */
    chain(fn: (result) => Parser) {
        return new Parser(parserState => {
            const nextState = this.parserStateTransformerFn(parserState);

            if (nextState.isError) return nextState;

            const nextParser = fn(nextState.result);

            return nextParser.parserStateTransformerFn(nextState);
        });
    }

    /** Similar to map(), but runs only if the parser returns an error. */
    errorMap(fn: (error, index: number) => string) {
        return new Parser(parserState => {
            const nextState = this.parserStateTransformerFn(parserState);

            if (!nextState.isError) return nextState;

            return updateParserError(nextState, fn(nextState.error, nextState.index));
        });
    }
}

/** Parser that matches a string (case sensitive) */
export const str = (s: string, caseSensitive = true) => new Parser(parserState => {
    const {
        target,
        index,
        isError
    } = parserState;

    if (isError) {
        return parserState;
    }

    const slicedTarget = ((caseSensitive) ? target : target.toLowerCase()).slice(index);

    if (slicedTarget.length === 0) {
        return updateParserError(parserState, `str: Tried to match "${s}", but got Unexpected end of input.`);
    }

    if (!caseSensitive) {
        s = s.toLowerCase();
    }

    if (slicedTarget.startsWith(s)) {
        return updateParserState(parserState, index + s.length, s);
    }

    return updateParserError(
        parserState,
        `str: Tried to match "${s}", but got "${target.slice(index, index + 10)}"`
    );
})

/** Parser that matches the given regex */
export const regex = (regex) => new Parser(parserState => {
    const {
        target,
        index,
        isError
    } = parserState;

    if (isError) {
        return parserState;
    }

    const slicedTarget = target.slice(index)

    if (slicedTarget.length === 0) {
        return updateParserError(parserState, `regex: Got Unexpected end of input.`);
    }

    const regexMatch = slicedTarget.match(regex);

    if (regexMatch) {
        return updateParserState(parserState, index + regexMatch[0].length, regexMatch[0]);
    }

    return updateParserError(
        parserState,
        `regex: Could not match ${regex.toString()} at index ${index}`
    );
});

const lettersRegex = /^[A-Za-z]+/;
/** Parser that matches letters */
export const letters = new Parser(parserState => {
    const {
        target,
        index,
        isError
    } = parserState;

    if (isError) {
        return parserState;
    }

    const slicedTarget = target.slice(index)

    if (slicedTarget.length === 0) {
        return updateParserError(parserState, `letters: Got Unexpected end of input.`);
    }

    const regexMatch = slicedTarget.match(lettersRegex);

    if (regexMatch) {
        return updateParserState(parserState, index + regexMatch[0].length, regexMatch[0]);
    }

    return updateParserError(
        parserState,
        `letters: Could not match letters at index ${index}`
    );
});

const digitsRegex = /^[0-9]+/;
/** Parser that matches numbers */
export const digits = new Parser(parserState => {
    const {
        target,
        index,
        isError
    } = parserState;

    if (isError) {
        return parserState;
    }

    const slicedTarget = target.slice(index)

    if (slicedTarget.length === 0) {
        return updateParserError(parserState, `digits: Got Unexpected end of input.`);
    }

    const regexMatch = slicedTarget.match(digitsRegex);

    if (regexMatch) {
        return updateParserState(parserState, index + regexMatch[0].length, regexMatch[0]);
    }

    return updateParserError(
        parserState,
        `digits: Could not match digits at index ${index}`
    );
});

/** Parser that tries to match a sequence of parsers */
export const sequenceOf = (parsers: Parser[]) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    const results = [];
    let nextState = parserState;

    for (let p of parsers) {
        nextState = p.parserStateTransformerFn(nextState);
        results.push(nextState.result);
    }

    if (nextState.isError) {
        return nextState;
    }

    return updateParserResult(nextState, results);
})

/** Parser that tries to match a single parser of the given parsers */
export const choice = (parsers: Parser[]) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    for (let p of parsers) {
        const nextState = p.parserStateTransformerFn(parserState);
        if (!nextState.isError) {
            return nextState;
        }
    }

    return updateParserError(
        parserState,
        `choice: Unable to match with any parser at index ${parserState.index}`
    );
});

/** 
 * Parser that tries to match 0 or more of the given parsers.
 * This will never result in a error.
 */
export const many = (parser: Parser) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    let nextState = parserState;
    const results = [];
    let done = false;

    while (!done) {
        let testState = parser.parserStateTransformerFn(nextState);

        if (!testState.isError) {
            results.push(testState.result);
            nextState = testState;
        } else {
            done = true;
        }
    }

    return updateParserResult(nextState, results);
});

/** 
 * Parser that tries to match 1 or more of the given parsers.
 * If no parser matched, returns an error.
 */
export const many1 = (parser: Parser) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    let nextState = parserState;
    const results = [];
    let done = false;

    while (!done) {
        nextState = parser.parserStateTransformerFn(nextState);
        if (!nextState.isError) {
            results.push(nextState.result);
        } else {
            done = true;
        }
    }

    if (results.length === 0) {
        return updateParserError(
            parserState,
            `many1: Unable to match any input using parser @ index ${parserState.index}`
        );
    }

    return updateParserResult(nextState, results);
});

/**
 * Parser that tries to match values separated by separatorParser.
 * Will not return error by itself.
 */
export const sepBy = (separatorParser: Parser) => (valueParser: Parser) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    const results = [];
    let nextState = parserState;

    while (true) {
        const thingWeWantState = valueParser.parserStateTransformerFn(nextState);
        if (thingWeWantState.isError) {
            break;
        }
        results.push(thingWeWantState.result);
        nextState = thingWeWantState;

        const separatorState = separatorParser.parserStateTransformerFn(nextState);
        if (separatorState.isError) {
            break;
        }
        nextState = separatorState;
    }
    return updateParserResult(nextState, results);
});

/**
 * Parser that tries to match values separated by separatorParser.
 * Will return error if no separator is found.
 */
export const sepBy1 = (separatorParser: Parser) => (valueParser: Parser) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    const results = [];
    let nextState = parserState;

    while (true) {
        const thingWeWantState = valueParser.parserStateTransformerFn(nextState);
        if (thingWeWantState.isError) {
            break;
        }
        results.push(thingWeWantState.result);
        nextState = thingWeWantState;

        const separatorState = separatorParser.parserStateTransformerFn(nextState);
        if (separatorState.isError) {
            break;
        }
        nextState = separatorState;
    }

    if (results.length === 0) {
        return updateParserError(
            parserState,
            `sepBy1: Unable to capture any results at index ${parserState.index}`
        )
    }

    return updateParserResult(nextState, results);
});

/** Matches 0 or 1 instances of the parser */
export const boolean = (parser: Parser) => new Parser(parserState => {
    if (parserState.isError) {
        return parserState;
    }

    let testState = parser.parserStateTransformerFn(parserState);

    if (!testState.isError) {
        return testState;
    } else {
        return updateParserResult(parserState, null);
    }
});

/** Parser that tries to match content located between two parsers  */
export const between = (leftParser: Parser, rightParser: Parser) => (contentParser: Parser) => sequenceOf([
    leftParser,
    contentParser,
    rightParser
]).map(results => results[1]);

/** 
 * Allows lazy evaluation of a parser by wrapping the future parser in a function/
 * Used for recursive parsers.
 * */
export const lazy = (parserThunk: () => Parser) => new Parser(parserState => {
    const parser = parserThunk();
    return parser.parserStateTransformerFn(parserState);
})

/** 
 * Parser that inmediately returns an error.
 */
export const fail = errMsg => new Parser(parserState => {
    return updateParserError(parserState, errMsg);
});

/**
 * Parser that inmediately succeeds with a given value.
 */
export const succeed = value => new Parser(parserState => {
    return updateParserResult(parserState, value);
});

/**
 * Allows easy context sharing between multiple parsers inside a function.
 * 
 * Instead of using multiple .chain().map() to share the context of previous parsers,
 * allows to use 'yield' and store the parser context directly inside a variable. 
 * 
 * Useful in cases where sequenceOf may not be enough, because context of previous parsers is needed.
 * 
 * @example
 * const varDeclarationParser = contextual(function* () {
 *     const declarationType = yield choice([
 *         str('VAR '),
 *         str('GLOBAL_VAR '),
 *     ]);
 * 
 *     const varName = yield letters;
 *     const type = yield choice([
 *         str(' INT '),
 *         str(' STRING '),
 *         str(' BOOL '),
 *     ]);
 * 
 *     let data;
 *     if (type === ' INT ') {
 *         data = yield digits;
 *     } else if (type === ' STRING ') {
 *         data = yield sequenceOf([
 *             str('"'),
 *             letters,
 *             str('"'),
 *         ]).map(([quote1, data, quote2]) => data);
 *     } else if (type === ' BOOL ') {
 *         data = yield choice([
 *             str('true'),
 *             str('false'),
 *         ]);
 *     }
 * 
 *     return {
 *         varName,
 *         data,
 *         type,
 *         declarationType
 *     };
 * });
 */
export const contextual = (generatorFn: GeneratorFunction) => {
    return succeed(null).chain(() => {
        const iterator = generatorFn() as Generator<unknown, any, Parser>;

        const runStep = (nextValue?) => {
            const iteratorResult = iterator.next(nextValue);

            if (iteratorResult.done) {
                return succeed(iteratorResult.value);
            }

            const nextParser = iteratorResult.value;

            if (!(nextParser instanceof Parser)) {
                throw new Error('contextual: yielded values must always be parsers!');
            }

            return nextParser.chain(runStep);
        };

        return runStep();
    })
}

/** Parser that matches at least 1 whitespace, except new lines. */
export const whitespace = regex(/^[\r\t\f\v ]+/);
/** Parser that matches a safe word ([A-Za-z0-9_-]) */
export const safeword = regex(/^[A-Za-z0-9_-]+/);

/** Console logs the parserState before and after transforming */
export const debugParser = (p: Parser) => new Parser(parserState => {
    console.log('%cDebug parser at: ', 'color:yellow');
    console.trace();
    console.log(parserState);
    const a = p.parserStateTransformerFn(parserState);
    console.log(a);
    return a;
})