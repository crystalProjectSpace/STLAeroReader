'use strict'

const fs = require('fs')

const {readSTL} = require('./modules/stlReader.js')

const AeroModel = require('./modules/aeroModel.js')
const AtmoModel = require('./modules/atmoModel.js')

const {atmosphere} = require('./atmo/earth_atmo.json')
const {active_var, vehicles} = require("./init_data.json")

const {vehicle_data, flight_parameters} = vehicles[active_var]

const activeAtmo = new AtmoModel()
activeAtmo.initAtmo(atmosphere)

const prepareADXResult = function(adxTab, MV, AV, vehicle_name, area) {
    let Cxa_str = ''
    let Cya_str = ''
    let Cx_str = ''
    let Cy_str = ''

    const nM = MV.length
    const nA = AV.length

    for(let i = 0; i < nM; i++) {
        for(let j = 0; j < nA; j++) {
            const CTA = Math.cos(AV[j])
            const STA = Math.sin(AV[j])
            const { Cx, Cy, CxF } = adxTab[i][j]
            const Cxa = -Cx * CTA + Cy * STA + CxF
            const Cya = Cx * STA + Cy * CTA
            
            Cxa_str += `${Cxa.toFixed(4).replace('.', ',')}\t`
            Cya_str += `${Cya.toFixed(4).replace('.', ',')}\t`
            Cx_str += `${(-Cx).toFixed(4).replace('.', ',')}\t`
            Cy_str += `${Cy.toFixed(4).replace('.', ',')}\t`
        }
        Cxa_str += '\n'
        Cya_str += '\n'
        Cx_str += '\n'
        Cy_str += '\n'
    }

    const resultHeader = `Aerodynamic characteristics for ${vehicle_name}\n Calculated for specific area: ${area} m2\n\n\n\n`

    const machPoints = `Mach points\n ${MV.map(Mach => Mach.toFixed(2).replace('.', ',')).join('\t')}\n\n`

    const alphaPoints = `AoA points\n ${AV.map(alpha => (alpha * 57.3).toFixed(2).replace('.', ',')).join('\t')}\n\n\n\n`

    const adxTabs = [
        'Cx\n',
        Cx_str,
        '\n\n',
        'Cy\n',
        Cy_str,
        '\n\n\n\n',
        'Cxa\n',
        Cxa_str,
        '\n\n',
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
    console.log([
        'geometry ready',
        `length: ${model.size}`,
        `height: ${model.height}`,
        `width: ${model.width}`
    ].join('\n'))
    const ADX = model.calcTable(MV, AV, 0, test_flow)

    console.log('aerodinamic data ready to output;\n')

    prepareADXResult(ADX, MV, AV, vehicle_data.vehicle_name, area)
}

readSTL(`./data/${vehicle_data.vehicle_name}.stl`, processADX)