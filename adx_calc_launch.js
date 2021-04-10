'use strict'

const fs = require('fs')

const {readSTL} = require('./modules/stlReader.js')

const AeroModel = require('./modules/aeroModel.js')
const AtmoModel = require('./modules/atmoModel.js')

const {atmosphere} = require('./atmo/earth_atmo.json')
const {flight_parameters, vehicle_data} = require("./init_data.json")

const activeAtmo = new AtmoModel()
activeAtmo.initAtmo(atmosphere)

const prepareADXResult = function(adxTab, MV, AV, vehicle_name, area) {
    let Cxa_str = ''
    let Cya_str = ''

    const nM = MV.length
    const nA = AV.length

    for(let i = 0; i < nM; i++) {
        for(let j = 0; j < nA; j++) {
            const CTA = Math.cos(AV[j])
            const STA = Math.sin(AV[j])
            const { Cx, Cy, CxF } = adxTab[i][j]
            const Cxa = Cx * CTA + Cy * STA + CxF
            const Cya = -Cx * STA + Cy * CTA
            
            Cxa_str += `${Cxa.toFixed(4).replace('.', ',')}\t`
            Cya_str += `${Cya.toFixed(4).replace('.', ',')}\t`
        }
        Cxa_str += '\n'
        Cya_str += '\n'
    }

    const resultHeader = `Aerodynamic characteristics for ${vehicle_name}\n Calculated for specific area: ${area} m2\n\n\n\n`

    const machPoints = `Mach points\n ${MV.map(Mach => Mach.toFixed(2).replace('.', ',')).join('\t')}\n\n`

    const alphaPoints = `AoA points\n ${AV.map(alpha => (alpha * 57.3).toFixed(2).replace('.', ',')).join('\t')}\n\n\n\n`

    const adxTabs = [
        'Cxa\n',
        Cxa_str,
        '\n\n\n\n',
        'Cya\n',
        Cya_str
    ].join('')

    fs.writeFile(
        `${vehicle_name}.txt`,
        (resultHeader + machPoints + alphaPoints + adxTabs),
        'ascii',
        function(err) {
            if(err) {
                console.log('failed to save result');
                console.log(err)
            } else {
                console.log(`aerodynamic data saved to ${vehicle_name}.txt;\n`)
            }
        }
    )
}

const processADX = function(geometry) {
    const { H, MV, AV } = flight_parameters
    const {area} = vehicle_data

    activeAtmo.setupIndex(H)
    const test_flow = activeAtmo.getAtmo(H)

    const model = new AeroModel()
    
    model.init(geometry, area)
    const ADX = model.calcTable(MV, AV, 0, test_flow)

    console.log('aerodinamic data ready to output;\n')

    prepareADXResult(ADX, MV, AV, vehicle_data.vehicle_name, area)
}

readSTL(`./data/${vehicle_data.vehicle_name}.stl`, processADX)