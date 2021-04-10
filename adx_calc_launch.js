'use strict'

const {readSTL} = require('./modules/stlReader.js')
const AeroModel = require('./modules/aeroModel.js')
const AtmoModel = require('./modules/atmoModel.js')
const {atmosphere} = require('./atmo/earth_atmo.json')

const activeAtmo = new AtmoModel()
activeAtmo.initAtmo(atmosphere)

const calc_data = {
    area: 7.065,
    H: 40000,
    MV: [30],
    AV: [0, 2/57.3, 5/57.3, 10/ 57.3, 20/57.3, 30/57.3, 45/57.3, 60/57.3]
}

const processADX = function(geometry) {
    activeAtmo.setupIndex(calc_data.H)
    const test_flow = activeAtmo.getAtmo(calc_data.H)

    const model = new AeroModel()
    const { area, MV, AV } = calc_data
    model.init(geometry, area)
    const testADX = model.calcTable(MV, AV, 0, test_flow)

    const nM = MV.length
    const nA = AV.length

    for(let i = 0; i < nM; i++) {
        let strOutput = ''
        for(let j = 0; j < nA; j++) {
            const {Cxa, Cya, CxF} = testADX[i][j]
            const CTA = Math.cos(AV[j])
            const STA = Math.sin(AV[j])
            const CX_a = Cxa * CTA + Cya * STA + CxF
            const CY_a = -Cxa * STA + Cya * CTA
            const Ka = CY_a / CX_a
            strOutput += `cxa: ${CX_a.toFixed(4)}; cya: ${CY_a.toFixed(4)}; Ka: ${Ka.toFixed(4)};\n`
        }
        console.log(strOutput + '\n======================\n')
    }
}

readSTL('./data/BICONIC_mod_2.stl', processADX)