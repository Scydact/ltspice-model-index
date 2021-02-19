
// .model 1N914 D(Is=2.52n Rs=.568 N=1.752 Cjo=4p M=.4 
//              + tt=20n Iave=200m Vpk=75 mfg=OnSemi type=silicon)

import { between, choice, digits, lazy, sequenceOf, str } from "./StrParse.js";
import { setWindow } from "./Utils.js";

const betweenBrackets = between(str('('), str(')'));
const numberParser = digits.map(x => ({
    type: 'number',
    value: Number(x),
}));
const operatorParser = choice([
    str('+'),
    str('-'),
    str('*'),
    str('/'),
]);
const expr = lazy(() => choice([
    numberParser,
    operationParser,
]));

const operationParser = betweenBrackets(sequenceOf([
    expr,
    str(' '),
    operatorParser,
    str(' '),
    expr
])).map(results => ({
    type: 'operation',
    value: {
        op: results[2],
        a: results[0],
        b: results[4],
    }
}))

const complexString = '((10 * 2) + ((50 / 3) - 2))';

const evaluate = (node) => {
    if (node.type == 'operation') {
        
    }
}  

const result = expr.run(complexString);
console.log(result);
setWindow({ complexString, expr, result });