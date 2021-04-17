const GasDynamics = require('./gasDynamics.js')
const Vector = require('./vectorOps.js')
class AeroModel {
    constructor() {
        this.area = 0       // Характерная площадь
        this.nFacets = 0    // количество элементарных фасеток
        this.facets = []    // Массив фасеток, составляющих геометрию объекта
        this.sWetted = 0    // Площадь смачиваемой поверхности
        this.size = 0       // Длина
        this.width = 0
        this.height = 0
    }
    /**
     * @description получить исходные данные, на их основе определить смачиваемую поверхность конуса
     * @param {Array.<Object>} facets массив точек, формирующих контур ЛА
     * @param {Number} area характерная площадь ЛА
     * @return {void}
     */
    init(facets, area) {
        this.area = area
        this.facets = facets
        this.nFacets = this.facets.length

        let xMin = 0
        let xMax = 0
        let yMin = 0
        let yMax = 0
        let zMin = 0
        let zMax = 0

        for(let i = 0; i < this.nFacets; i++) {
            const {p1, p2, p3} = this.facets[i]
            this.sWetted += Vector.heronArea(p1, p2, p3)

            xMin = Math.min(xMin, p1[0], p2[0], p3[0])
            xMax = Math.max(xMax, p1[0], p2[0], p3[0])
            yMin = Math.min(yMin, p1[1], p2[1], p3[1])
            yMax = Math.max(yMax, p1[1], p2[1], p3[1])
            zMin = Math.min(zMin, p1[2], p2[2], p3[2])
            zMax = Math.max(zMax, p1[2], p2[2], p3[2])
        }

        this.size = xMax - xMin
        this.height = yMax - yMin
        this.width = zMax - zMin
    }
    /**
     * @description получить параметры обтекания элементарной объекта при одном значении числа M, угла атаки и скольжения
     * @param {Number} Qpress скоростной напор
     * @param {Number} ThMax максимальный угол присоединенного скачка
     * @param {Number} NuMax максимальный местный угол клина
     * @param {Number} Mach число M
     * @param {Object} flow поток (давление, плотность, температура, скорость звука, постоянная адиабаты, газовая постоянная)
     * @param {Number} alpha угол атаки
     * @param {Number} betha угол скольжения
     * @return {Object} параметры обтекания
     */
    calcSinglePoint(Qpress, ThMax, NuMax, Mach, flow, alpha, betha, Kn = 0) {
        const {P, k, aSn, vChaotic} = flow        

        const QS = Qpress * this.area
        
        const CTA = Math.cos(alpha)
        const STA = Math.sin(alpha)
        const CTB = Math.cos(betha)
        const STB = Math.sin(betha)

        const Velocity = [
            CTA * CTB,
            -STA,
            CTA * STB
        ]

        const adxSumm = [0, 0, 0]
        const torqueSumm = [0, 0, 0]
        const PI_05 = Math.PI * 0.5
        
        for(let i = 0; i < this.nFacets; i++) {
            const {norm, p1, p2, p3} = this.facets[i]
            const localNu0 = Vector.angleBetween(Velocity, norm)
            const localNu = Math.abs(localNu0) > PI_05 ?
                -Math.abs(localNu0) + PI_05 :
                PI_05 - Math.abs(localNu0)

            const localArea = Vector.heronArea(p1, p2, p3)
            const localCenter = Vector.triCenter(p1, p2, p3)

            let deltaP = 1
            if(Kn < 1E-2) {
                deltaP = GasDynamics.getDeltaPressure(ThMax, NuMax, localNu, Mach, k)
            } else if(Kn >= 1E-2 && Kn < 10) {
                const k_rare = (2.3026 - Math.log(Kn)) / 6.908
                deltaP = k_rare * GasDynamics.getDeltaPressure(ThMax, NuMax, localNu, Mach, k) + (1 - k_rare) * GasDynamics.getSlipFlow(localNu, Mach, k, aSn, vChaotic)
            } else if (Kn >= 10){
                deltaP = GasDynamics.getSlipFlow(localNu, Mach, k, aSn, vChaotic)
            }

            const localForce = deltaP * P * localArea
            
            const dX = -localForce * norm[0]
            const dY = -localForce * norm[1]
            const dZ = -localForce * norm[2]
            
            adxSumm[0] += dX
            adxSumm[1] += dY
            adxSumm[2] += dZ

            torqueSumm[0] += (dY * localCenter[2] + dZ * localCenter[1])
            torqueSumm[1] += (dX * localCenter[2] + dZ * localCenter[0])
            torqueSumm[2] += (dX * localCenter[1] + dY * localCenter[0])
        }

        return {
            X_force: adxSumm[0], // сопротивление
            Y_force: adxSumm[1], // подъемная сила
            Z_force: adxSumm[2], // боковая сила
            Cx: adxSumm[0] / QS, // коэф.сопротивления
            Cy: adxSumm[1] / QS, // коэф.подъемной силы
            Cz: adxSumm[2] / QS, // коэф. боковой силы
            mX: torqueSumm[0] / (QS * this.size),
            mY: torqueSumm[1] / (QS * this.size),
            mZ: torqueSumm[2] / (QS * this.size)
        }        
    }
    /**
     * @description получить таблицу АДХ для заданного диапазона чисел M и углов атаки
     * @param {Array.<Number>} MV узловые точки по числам M
     * @param {Array.Number} AV узловые точки по углам атаки
     * @param {Number} betha угол скольжения
     * @param {Object} flow параметры невозмущенного потока (см.предыдущий метод)
     * @returns {Array.<Object>} таблица АДХ-коэффициентов
     */
    calcTable(MV, AV, betha, flow) {
        const nMach = MV.length
        const nAlpha = AV.length
        const {P, k, aSn} = flow
        const result = new Array(nMach)
        const adxParameters = []
        
        for(let i = 0; i < nMach; i++) {
            result[i] = []
            const Mach = MV[i]
            const reynolds = Mach * aSn * this.size / flow.viscosity
            const knudsen = Mach * Math.sqrt(0.5 * k * Math.PI) / reynolds
            const CxF = 0.074 * Math.pow(reynolds, -0.2) * this.sWetted / this.area
            const Qpress = 0.5 * k * P * Mach * Mach
            const {NuMax, ThMax} = GasDynamics.getThMax(Mach, k)
            
            adxParameters.push({reynolds, knudsen})

            for(let j = 0; j < nAlpha; j++) {
                const alpha = AV[j]
                const adxMachAlpha = {
                    ...this.calcSinglePoint(Qpress, ThMax, NuMax, Mach, flow, alpha, betha, knudsen),
                    CxF
                }
                result[i].push(adxMachAlpha)
            }
        }

        return { adxTable: result, adxParameters }
    }
}

module.exports = AeroModel