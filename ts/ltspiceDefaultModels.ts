import { caseUnsensitiveProperty, objectMap, parseLtspiceNumber } from "./Utils.js";

export type i_defaultParamDefinition = {
    [key: string]: i_paramDefinition
}
export type i_paramDefinition = {
    description: string,
    units: string,
    default?: string,
    example?: string,
}

function extractTableData(table) {
    const rows = [...table.querySelectorAll('tr')];
    const headers = [...rows[0].querySelectorAll('td')].map(x => x.innerText.toLowerCase());
    const o = {};
    for (const row of rows.slice(1)) {
        const cells = [...row.querySelectorAll('td')].map(x => x.innerText);
        const so = Object.fromEntries(cells.slice(1).map(function (e, i) {
            return [headers.slice(1)[i], e];
        }));
        o[cells[0]] = so;
    }
    return o;
}

const STD_PARAMS: i_defaultParamDefinition = {
    mfg: {
        description: "Manufacturer",
        units: "-",
    },
}

// Most of this info taken from http://ltwiki.org/ using extractTableData()
const NPN: i_defaultParamDefinition = {
    ...STD_PARAMS,
    Is: {
        description: "Transport saturation current",
        units: "A",
        default: "1e-16"
    },
    Bf: {
        description: "Ideal maximum forward beta",
        units: "-",
        default: "100"
    },
    Nf: {
        description: "Forward current emission coefficient",
        units: "-",
        default: "1."
    },
    Vaf: {
        description: "Forward Early voltage",
        units: "V",
        default: "Infin."
    },
    Ikf: {
        description: "Corner for forward beta high current roll-off",
        units: "A",
        default: "Infin."
    },
    Ise: {
        description: "B-E leakage saturation current",
        units: "A",
        default: "0."
    },
    Ne: {
        description: "B-E leakage emission coefficient",
        units: "-",
        default: "1.5"
    },
    Br: {
        description: "Ideal maximum reverse beta",
        units: "-",
        default: "1."
    },
    Nr: {
        description: "Reverse current emission coefficient",
        units: "-",
        default: "1."
    },
    Var: {
        description: "Reverse Early voltage",
        units: "V",
        default: "Infin."
    },
    Ikr: {
        description: "Corner for reverse beta high current roll-off",
        units: "A",
        default: "Infin."
    },
    Isc: {
        description: "B-C leakage saturation current",
        units: "A",
        default: "0"
    },
    Nc: {
        description: "B-C leakage emission coefficient",
        units: "-",
        default: "2"
    },
    Rb: {
        description: "Zero-bias base resistance",
        units: "Ω",
        default: "0"
    },
    Irb: {
        description: "Current where base resistance falls halfway to its min value",
        units: "A",
        default: "Infin."
    },
    Rbm: {
        description: "Minimum base resistance at high currents",
        units: "Ω",
        default: "Rb"
    },
    Re: {
        description: "Emitter resistance",
        units: "Ω",
        default: "0."
    },
    Rc: {
        description: "Collector resistance",
        units: "Ω",
        default: "0."
    },
    Cje: {
        description: "B-E zero-bias depletion capacitance",
        units: "F",
        default: "0."
    },
    Vje: {
        description: "B-E built-in potential",
        units: "V",
        default: "0.75"
    },
    Mje: {
        description: "B-E junction exponential factor",
        units: "-",
        default: "0.33"
    },
    Tf: {
        description: "Ideal forward transit time",
        units: "s",
        default: "0."
    },
    Xtf: {
        description: "Coefficient for bias dependence of Tf",
        units: "-",
        default: "0."
    },
    Vtf: {
        description: "Voltage describing Vbc dependence of Tf",
        units: "V",
        default: "Infin."
    },
    Itf: {
        description: "High-current parameter for effect on Tf",
        units: "A",
        default: "0."
    },
    Ptf: {
        description: "Excess phase at freq=1/(Tf*2*PI)Hz",
        units: "º",
        default: "0."
    },
    Cjc: {
        description: "B-C zero-bias depletion capacitance",
        units: "F",
        default: "0."
    },
    Vjc: {
        description: "B-C built-in potential",
        units: "V",
        default: "0.75"
    },
    Mjc: {
        description: "B-C junction exponential factor",
        units: "-",
        default: "0.33"
    },
    Xcjc: {
        description: "Fraction of B-C depletion capacitance connected to internal base node",
        units: "-",
        default: "1."
    },
    Tr: {
        description: "Ideal reverse transit time",
        units: "s",
        default: "0."
    },
    Cjs: {
        description: "Zero-bias collector-substrate capacitance",
        units: "F",
        default: "0."
    },
    Vjs: {
        description: "Substrate junction built-in potential",
        units: "V",
        default: "0.75"
    },
    Mjs: {
        description: "Substrate junction exponential factor",
        units: "-",
        default: "0."
    },
    Xtb: {
        description: "Forward and reverse beta temperature exponent",
        units: "-",
        default: "0."
    },
    Eg: {
        description: "Energy gap for temperature effect on Is",
        units: "eV",
        default: "1.11"
    },
    Xti: {
        description: "Temperature exponent for effect on Is",
        units: "-",
        default: "3."
    },
    Kf: {
        description: "Flicker-noise coefficient",
        units: "-",
        default: "0."
    },
    Af: {
        description: "Flicker-noise exponent",
        units: "-",
        default: "1."
    },
    Fc: {
        description: "Coefficient for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5"
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27"
    },
    Cn: {
        description: "Quasi-saturation temperature coefficient for hole mobility",
        units: "-",
        default: "2.42"
    },
    D: {
        description: "Quasi-saturation temperature coefficient for scattering-limited hole carrier velocity",
        units: "-",
        default: ".87"
    },
    Gamma: {
        description: "Epitaxial region doping factor",
        units: " ",
        default: "1e-11"
    },
    Qco: {
        description: "Epitaxial region charge factor",
        units: "C",
        default: "0."
    },
    Quasimod: {
        description: "Quasi-saturation flag for temperature dependence",
        units: "-",
    },
    Rco: {
        description: "Epitaxial region resistance",
        units: "Ω",
        default: "0."
    },
    Vg: {
        description: "Quasi-saturation extrapolated bandgap voltage at 0ºK",
        units: "V",
        default: "1.206"
    },
    Vo: {
        description: "Carrier mobility knee voltage",
        units: "V",
        default: "10."
    },
    Tre1: {
        description: "Re linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Tre2: {
        description: "Re quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trb1: {
        description: "Rb linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trb2: {
        description: "Rb quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trc1: {
        description: "Rc linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trc2: {
        description: "Rc quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Trm1: {
        description: "Rmb linear temperature coefficient",
        units: "1/ºC",
        default: "0."
    },
    Trm2: {
        description: "Rmb quadratic temperature coefficient",
        units: "1/ºC²",
        default: "0."
    },
    Iss: {
        description: "Substrate junction saturation current",
        units: "A",
        default: "0."
    },
    Ns: {
        description: "Substrate junction emission Coefficient",
        units: "-",
        default: "1."
    },

    Level: {
        description: "Can be used to specify another type of BJT in LTspice.",
        units: "-",
    },

    // Ignored by LTSPICE, but useful:
    Vceo: {
        description: "Maximun collector-emitter voltage. \nIgnored by LTspice, but useful when comparing models.",
        units: "V",
    },
    Icrating: {
        description: "Maximum collector current. \nIgnored by LTspice, but useful when comparing models.",
        units: "A",
    },

};

const PNP: i_defaultParamDefinition = {
    ...NPN,
    Cn: { ...NPN.Cn, default: "2.2" },
    D: { ...NPN.D, default: ".52" },
}

const D: i_defaultParamDefinition = {
    ...STD_PARAMS,
    Ron: {
        description: "Resistance in forward conduction",
        units: "Ω",
        default: "1."
    },
    Roff: {
        description: "Resistance when off",
        units: "Ω",
        default: "1./Gmin"
    },
    Vfwd: {
        description: "Forward threshold voltage to enter conduction",
        units: "V",
        default: "0."
    },
    Vrev: {
        description: "Reverse breakdown voltage",
        units: "V",
        default: "Infin."
    },
    Rrev: {
        description: "Breakdown impedance",
        units: "Ω",
        default: "Ron"
    },
    Ilimit: {
        description: "Forward current limit",
        units: "A",
        default: "Infin."
    },
    RevIlimit: {
        description: "Reverse current limit",
        units: "A",
        default: "Infin."
    },
    Epsilon: {
        description: "Width of quadratic region",
        units: "V",
        default: "0."
    },
    RevEpsilon: {
        description: "Width of reverse quad. region",
        units: "V",
        default: "0."
    },
    Is: {
        description: "saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-7"
    },
    Rs: {
        description: "Ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "10."
    },
    N: {
        description: "Emission coefficient",
        units: "-",
        default: "1",
        example: "1."
    },
    Tt: {
        description: "Transit-time",
        units: "s",
        default: "0.",
        example: "2n"
    },
    Cjo: {
        description: "Zero-bias junction cap.",
        units: "F",
        default: "0",
        example: "2p"
    },
    Vj: {
        description: "Junction potential",
        units: "V",
        default: "1.",
        example: ".6"
    },
    M: {
        description: "Grading coefficient",
        units: "-",
        default: "0.5",
        example: "0.5"
    },
    Eg: {
        description: "Activation energy",
        units: "eV",
        default: "1.11",
        example: "1.11 Si\n\n0.69 Sbd\n\n0.67 Ge"
    },
    Xti: {
        description: "Sat.-current temp. exp",
        units: "-",
        default: "3.0",
        example: "3.0 jn\n\n2.0 Sbd"
    },
    Kf: {
        description: "Flicker noise coeff.",
        units: "-",
        default: "0",
        example: " "
    },
    Af: {
        description: "Flicker noise exponent",
        units: "1",
        default: "1",
        example: " "
    },
    Fc: {
        description: "Coeff. for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5",
        example: " "
    },
    BV: {
        description: "Reverse breakdown voltage",
        units: "V",
        default: "Infin.",
        example: "40."
    },
    Ibv: {
        description: "Current at breakdown voltage",
        units: "A",
        default: "1e-10",
        example: " "
    },
    Tnom: {
        description: "Parameter measurement temp.",
        units: "ºC",
        default: "27",
        example: "50"
    },
    Isr: {
        description: "Recombination current parameter",
        units: "A",
        default: "0",
        example: " "
    },
    Nr: {
        description: "Isr emission coeff.",
        units: "-",
        default: "2",
        example: " "
    },
    Ikf: {
        description: "High-injection knee current",
        units: "A",
        default: "Infin.",
        example: " "
    },
    Tikf: {
        description: "Linear Ikf temp coeff.",
        units: "/ºC",
        default: "0",
        example: " "
    },
    Trs1: {
        description: "linear Rs temp coeff.",
        units: "/ºC",
        default: "0",
        example: " "
    },
    Trs2: {
        description: "Quadratic Rs temp coeff.",
        units: "/ºC/ºC",
        default: "0",
        example: " "
    },
    Vpk: {
        description: "Peak voltage rating",
        units: "V"
    },
    Ipk: {
        description: "Peak current rating",
        units: "A"
    },
    Iave: {
        description: "Ave current rating",
        units: "A"
    },
    Irms: {
        description: "RMS current rating",
        units: "A"
    },
    diss: {
        description: "Maximum power dissipation rating",
        units: "W"
    },

    nbv: {
        description: "Reverse breakdown emission coefficient",
        units: "-",
        default: "1.",
        example: "2."
    },
    Ibvl: {
        description: "Low-level reverse breakdown knee current",
        units: "A",
        default: "0.",
        example: " "
    },
    nbvl: {
        description: "Low-level reverse breakdown emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Tbv1: {
        description: "Breakdown voltage temp coeff.",
        units: "/°C",
        default: "0.",
        example: " "
    },
    Tbv2: {
        description: "Quadratic breakdown voltage temp coeff.",
        units: "/°C2",
        default: "0.",
        example: " "
    },
    Perim: {
        description: "Default perimeter",
        units: "m",
        default: "0.",
        example: " "
    },
    Isw: {
        description: "Sidewall Is",
        units: "A",
        default: "0.",
        example: " "
    },
    ns: {
        description: "Sidewall emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Rsw: {
        description: "Sidewall series resistance",
        units: "Ω",
        default: "0.",
        example: " "
    },
    Cjsw: {
        description: "Sidewall Cjo",
        units: "F",
        default: "0.",
        example: " "
    },
    Vjsw: {
        description: "Sidewall Vj",
        units: "V",
        default: "Vj",
        example: " "
    },
    mjsw: {
        description: "Sidewall mj",
        units: "-",
        default: "0.33",
        example: " "
    },
    Fcs: {
        description: "Sidewall Fc",
        units: "-",
        default: "Fc",
        example: " "
    },
    Vp: {
        description: "Soft reverse recovery parameter",
        units: "-",
        default: "0.",
        example: ".65"
    },


    // Ignored by LTSPICE
    type: {
        description: "Diode type",
        units: "-",
    },
}

const NJF: i_defaultParamDefinition = {
    ...STD_PARAMS,
    Vto: {
        description: "Threshold voltage",
        units: "V",
        default: "-2.0",
        example: "-2.0"
    },
    Beta: {
        description: "Transconductance parameter",
        units: "A/V/V",
        default: "1e-4",
        example: "1e-3"
    },
    Lambda: {
        description: "Channel-length modulation parameter",
        units: "1/V",
        default: "0",
        example: "1e-4"
    },
    Rd: {
        description: "Drain ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "100"
    },
    Rs: {
        description: "Source ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "100"
    },
    Cgs: {
        description: "Zero-bias G-S junction capacitance",
        units: "F",
        default: "0.",
        example: "5p"
    },
    Cgd: {
        description: "Zero-bias G-D junction capacitance",
        units: "F",
        default: "0.",
        example: "1p"
    },
    Pb: {
        description: "Gate junction potential",
        units: "V",
        default: "1.",
        example: "0.6"
    },
    Is: {
        description: "Gate junction saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-14"
    },
    B: {
        description: "Doping tail parameter",
        units: "-",
        default: "1",
        example: "1.1"
    },
    KF: {
        description: "Flicker noise coefficient",
        units: "-",
        default: "0",
        example: " "
    },
    AF: {
        description: "Flicker noise exponent",
        units: "-",
        default: "1",
        example: " "
    },
    Fc: {
        description: "Coefficient for forward-depletion capacitance",
        units: "-",
        default: ".5",
        example: " "
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27",
        example: "50"
    },
    BetaTce: {
        description: "Transconductance parameter exponential temperature coefficient",
        units: "%/ºC",
        default: "0",
        example: " "
    },
    VtoTc: {
        description: "Threshold voltage temperature coefficient",
        units: "V/ºC",
        default: "0",
        example: " "
    },
    N: {
        description: "Gate junction emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Isr: {
        description: "Gate junction recombination current parameter",
        units: "A",
        default: "0.",
        example: " "
    },
    Nr: {
        description: "Emission coefficient for Isr",
        units: "-",
        default: "2",
        example: " "
    },
    alpha: {
        description: "Ionization coefficient",
        units: "1/V",
        default: "0",
        example: " "
    },
    Vk: {
        description: "Ionization knee voltage",
        units: "V",
        default: "0",
        example: " "
    },
    Xti: {
        description: "Saturation current temperature coefficient",
        units: "-",
        default: "3",
        example: " "
    }
}

const PJF = NJF;

const VDMOS: i_defaultParamDefinition = {
    ...STD_PARAMS,
    Vto: {
        description: "Zero-bias threshold voltage",
        units: "V",
        default: "0",
        example: "1.0"
    },
    Kp: {
        description: "Transconductance parameter",
        units: "A/V²",
        default: "2e-5",
        example: "3e-5"
    },
    Gamma: {
        description: "Bulk threshold parameter",
        units: "V^½",
        default: "0.",
        example: "0.37"
    },
    Phi: {
        description: "Surface inversion potential",
        units: "V",
        default: "0.6",
        example: "0.65"
    },
    Lambda: {
        description: "Channel-length modulation (level 1 and 2 only)",
        units: "1/V",
        default: "0.",
        example: "0.02"
    },
    Rd: {
        description: "Drain ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "1."
    },
    Rs: {
        description: "Source ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "1."
    },
    Cbd: {
        description: "Zero-bias B-D junction capacitance",
        units: "F",
        default: "0.",
        example: "20f"
    },
    Cbs: {
        description: "Zero-bias B-S junction capacitance",
        units: "F",
        default: "0.",
        example: "20f"
    },
    Is: {
        description: "Bulk junction saturation current",
        units: "A",
        default: "1e-14",
        example: "1e-15"
    },
    N: {
        description: "Bulk diode emission coefficient",
        units: "-",
        default: "1.",
        example: " "
    },
    Pb: {
        description: "Bulk junction potential",
        units: "V",
        default: "0.8",
        example: "0.87"
    },
    Cgso: {
        description: "Gate-source overlap capacitance per meter channel width",
        units: "F/m",
        default: "0.",
        example: "4e-11"
    },
    Cgdo: {
        description: "Gate-drain overlap capacitance per meter channel width",
        units: "F/m",
        default: "0.",
        example: "4e-11"
    },
    Cgbo: {
        description: "Gate-bulk overlap capacitance per meter channel width",
        units: "F/m",
        default: "0.",
        example: "2e-10"
    },
    Rsh: {
        description: "Drain and source diffusion sheet resistance",
        units: "Ω",
        default: "0.",
        example: "10."
    },
    Cj: {
        description: "Zero-bias bulk junction bottom capacitance per square meter of junction area",
        units: "F/m²",
        default: "0.",
        example: "2e-4"
    },
    Mj: {
        description: "Bulk junction bottom grading coefficient",
        units: "-",
        default: "0.5",
        example: "0.5"
    },
    Cjsw: {
        description: "Zero-bias bulk junction sidewall capacitance per meter of junction perimeter",
        units: "F/m",
        default: "0.",
        example: "1p"
    },
    Mjsw: {
        description: "Bulk junction sidewall grading coefficient",
        units: "-",
        default: ".50"
    },
    Js: {
        description: "Bulk junction saturation current per square-meter of junction area",
        units: "A/m",
        default: "0.",
        example: "1e-8"
    },
    Tox: {
        description: "Oxide thickness",
        units: "m",
        default: "1e-7",
        example: "1e-7"
    },
    Nsub: {
        description: "Substrate doping",
        units: "1/cm³",
        default: "0.",
        example: "4e15"
    },
    Nss: {
        description: "Surface state density",
        units: "1/cm²",
        default: "0.",
        example: "1e+10"
    },
    Nfs: {
        description: "Fast surface state",
        units: "1/cm²",
        default: "0.",
        example: "1e+10"
    },
    TPG: {
        description: "Type of gate material:\n\n+1 opp. to substrate\n\n-1 same as substrate\n\n0 Al gate",
        units: "-",
        default: "1",
        example: " "
    },
    Xj: {
        description: "Metallurgical junction depth",
        units: "m",
        default: "0.",
        example: "1µ"
    },
    Ld: {
        description: "Lateral diffusion",
        units: "m",
        default: "0.",
        example: "0.8µ"
    },
    Uo: {
        description: "Surface mobility",
        units: "cm²/V/s",
        default: "600",
        example: "700"
    },
    Ucrit: {
        description: "Critical field for mobility degradation (level 2 only)",
        units: "V/cm",
        default: "1e4",
        example: "1e4"
    },
    Uexp: {
        description: "Critical field exponent in mobility degradation (level 2 only)",
        units: "-",
        default: "0.",
        example: "0.1"
    },
    Utra: {
        description: "Transverse field coefficient (level 2 only)",
        units: "-",
        default: "0.",
        example: "0.3"
    },
    Vmax: {
        description: "Maximum carrier drift velocity (levels 2 & 3 only)",
        units: "m/s",
        default: "0.",
        example: "5e4"
    },
    Neff: {
        description: "Total channel-charge exponent (level 2 only)",
        units: "-",
        default: "1.",
        example: "5."
    },
    Kf: {
        description: "Flicker noise coefficient",
        units: "-",
        default: "0.",
        example: "1e-26"
    },
    Af: {
        description: "Flicker noise exponent",
        units: "-",
        default: "1.",
        example: "1.2"
    },
    Fc: {
        description: "Coefficient for forward-bias depletion capacitance formula",
        units: "-",
        default: "0.5",
        example: " "
    },
    Delta: {
        description: "Width effect on threshold voltage(levels 2 and 3)",
        units: "-",
        default: "0.",
        example: "1."
    },
    Theta: {
        description: "Mobility modulation (level 3 only)",
        units: "-",
        default: "0.",
        example: "0.1"
    },
    Eta: {
        description: "Static feedback (level 3 only)",
        units: "-",
        default: "0.",
        example: "1."
    },
    Kappa: {
        description: "Saturation field (level 3 only)",
        units: " ",
        default: "0.2",
        example: "0.5"
    },
    Tnom: {
        description: "Parameter measurement temperature",
        units: "ºC",
        default: "27",
        example: "50"
    },

    mtriode: {
        description: "Conductance multiplier in triode region(allows independent fit of triode and saturation regions",
        units: "-",
        default: "1.",
        example: "2."
    },
    subtreas: {
        description: "Current(per volt Vds) to switch from square law to exponential subthreshold conduction",
        units: "A/V",
        default: "0.",
        example: "1n"
    },
    BV: {
        description: "Vds breakdown voltage",
        units: "V",
        default: "Infin.",
        example: "40"
    },
    IBV: {
        description: "Current at Vds=BV",
        units: "A",
        default: "100pA",
        example: "1u"
    },
    NBV: {
        description: "Vds breakdown emission coefficient",
        units: "-",
        default: "1.",
        example: "10"
    },
    Rg: {
        description: "Gate ohmic resistance",
        units: "Ω",
        default: "0.",
        example: "2."
    },
    Rds: {
        description: "Drain-source shunt resistance",
        units: "Ω",
        default: "Infin.",
        example: "10Meg"
    },
    Rb: {
        description: "Body diode ohmic resistance",
        units: "Ω",
        default: "0.",
        example: ".5"
    },
    Cjo: {
        description: "Zero-bias body diode junction capacitance",
        units: "F",
        default: "0.",
        example: "1n"
    },
    Cgs: {
        description: "Gate-source capacitance",
        units: "F",
        default: "0.",
        example: "500p"
    },
    Cgdmin: {
        description: "Minimum non-linear G-D capacitance",
        units: "F",
        default: "0.",
        example: "300p"
    },
    Cgdmax: {
        description: "Maximum non-linear G-D capacitance",
        units: "F",
        default: "0.",
        example: "1000p"
    },
    A: {
        description: "Non-linear Cgd capacitance parameter",
        units: "-",
        default: "1.",
        example: ".5"
    },
    Vj: {
        description: "Body diode junction potential",
        units: "V",
        default: "1.",
        example: "0.87"
    },
    M: {
        description: "Body diode grading coefficient",
        units: "-",
        default: "0.5",
        example: "0.5"
    },
    Tt: {
        description: "Body diode transit time",
        units: "s",
        default: "0.",
        example: "10n"
    },
    Eg: {
        description: "Body diode activation energy for temperature effect on Is",
        units: "eV",
        default: "1.11",
        example: " "
    },
    Xti: {
        description: "Body diode saturation current temperature exponent",
        units: "-",
        default: "3.",
        example: " "
    },
    L: {
        description: "Length scaling",
        units: "-",
        default: "1.",
        example: " "
    },
    W: {
        description: "Width scaling",
        units: "-",
        default: "1.",
        example: " "
    },
    nchan: {
        description: "N-channel VDMOS",
        units: "-",
        default: "(true)",
        example: "-"
    },
    pchan: {
        description: "P-channel VDMOS",
        units: "-",
        default: "(false)",
        example: "-"
    },


    // Custom parameters: ignored by LTspice but useful for comparing
    Vds: {
        description: "Rated Drain-source voltage. \nIgnored by LTspice, but useful when comparing models.",
        units: "V",
    },
    Ron: {
        description: "On-state resistance. \nIgnored by LTspice, but useful when comparing models.",
        units: "Ω",
    },
    Qg: {
        description: "Gate charge. \nIgnored by LTspice, but useful when comparing models.",
        units: "C",
    },
}

const NMOS = VDMOS;
const PMOS = VDMOS;

export const DEFAULT_MODELS = {
    NPN,
    PNP,
    D,
    NJF,
    PJF,
    VDMOS,
    NMOS,
    PMOS,
};

export const MODEL_TYPES = {
    BJT: ['NPN', 'PNP'],
    D: ['D'],
    JFET: ['NJF', 'PJF'],
    MOSFET: ['VDMOS', 'NMOS', 'PMOS'],
}

export const MODEL_TYPE_TO_GENERAL_TYPE = (str: string) => {
    for (let key in MODEL_TYPES) {
        if (MODEL_TYPES[key].includes(str)) return key;
    }
    return null;
}

export const MODEL_TYPES_PARAMS = objectMap(MODEL_TYPES, x => {
    let o = {};
    for (let key of x.reverse()) {
        o = { ...o, ...DEFAULT_MODELS[key] }
    }
    return o;
})

export const DEFAULT_PARAMETERS = {
    MOSFET: [
        'Vto',
        'Qg',
        'Cgs',
        'Cjo',
        'Kp',
        'Is',
        'Ron',
        'Rg',
        'Tt',
    ],
    BJT: [
        'Bf',
        'Icrating',
        'Is',
        'Cje',
        'Rc',
        'Rb',
        'Vaf',
    ],
    D: [
        'Is',
        'Iave',
        'Tt',
        'Cjo',
        'Vpk',
        'Vj',
        'Eg',
        'Rs',
        'BV',
        'IBV',
    ],
    JFET: [
        'Vto',
        'Beta',
        'Lambda',
        'Is',
    ],
}

export function getParamUnit(param: string, type: string) {
    const a = DEFAULT_MODELS[type] as i_defaultParamDefinition;
    const b = caseUnsensitiveProperty(a, param);
    if (a && b) {
        const c = b.units;
        if (c === '-') return '';
        return c;
    }
    return '';
}

export function tryParseDefaultParam(x: i_paramDefinition) {
    const a = x.default;
    if (a === undefined) return undefined;

    if (a === 'Infin.') return parseLtspiceNumber(Infinity);
    if (isNaN(parseFloat(a))) return a; // text cases (parameter is another parameter like Rb)
    return parseLtspiceNumber(a); // Just a regular number
}

/** Contains valid parameters for each MODEL type. */
export const DEFAULT_MODEL_PARAM_KEYS = objectMap(DEFAULT_MODELS, x => Object.keys(x));

/** Contains valid parameters for each MODEL type, in lowercase. */
export const DEFAULT_MODEL_PARAM_KEYS_LOWERCASE = objectMap(DEFAULT_MODEL_PARAM_KEYS, x => x.map(y => y.toLowerCase()));

/** Valid standard diode types */
export const DIODE_TYPES = [
    'Silicon',
    'Schottky',
    'Zener',
    'Varactor',
    'LED',
    'TVS',
    'Rectifier',
    'Fast Recovery',
    'Switching',
    'Germanium',
]
export const DIODE_TYPES_LC = DIODE_TYPES.map(x => x.toLowerCase());