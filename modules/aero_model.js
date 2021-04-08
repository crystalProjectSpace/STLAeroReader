const GasDynamics = require('./gas_dynamics.js')
const Vector = require('./vectorOps.js')

class AeroModel {
    constructor() {
        this.area = 0
        this.nFacets = 0
        this.facets = []
    }
    /**
     * @description
     * @param {Array.<Object>} facets массив точек, формирующих контур ЛА
     * @param {Number} area характерная площадь ЛА
     * @return {void}
     */
    init(facets, area) {
        this.area = area
        this.facets = facets
        this.nFacets = this.facets.length
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
    calcSinglePoint(Qpress, ThMax, NuMax, Mach, flow, alpha, betha) {
        const {P, k} = flow        

        const QS = Qpress * this.area
        
        const CTA = Math.cos(alpha)
        const STA = Math.sin(alpha)
        const CTB = Math.cos(betha)
        const STB = Math.sin(betha)

        const Velocity = [
            CTA * CTB,
            STA,
            CTA * STB
        ]

        let adxSumm = [0, 0, 0]
        let adxCRSumm = [0, 0, 0]
        
        for(let i = 0; i < this.nFacets; i++) {
            const {norm, point1, point2, point3} = facets[i]
            const localNu = Math.PI - Vector.angleBetween(Velocity, norm)
            const localArea = Vector.heronArea(point1, point2, point3)
            const localCenter = Vector.triCenter(point1, point2, point3)
            const deltaP = GasDynamics.getDeltaPressure(ThMax, NuMax, localNu, Mach, k)
            const localForce = deltaP * P * localArea
            
            adxSumm[0] += localForce * norm[0]
            adxSumm[1] += localForce * norm[1]
            adxSumm[2] += localForce * norm[2]

            adxCRSumm[0] += adxSumm[0] * localCenter[0]
            adxCRSumm[0] += adxSumm[1] * localCenter[1]
            adxCRSumm[0] += adxSumm[2] * localCenter[2]
        }

        return {
            X_force: adxSumm[0], // сопротивление
            Y_force: adxSumm[1], // подъемная сила
            Z_force: adxSumm[2], // боковая сила
            Cxa: adxSumm[0] / QS, // коэф.сопротивления
            Cya: adxSumm[1] / QS, // коэф.подъемной силы
            Cza: adxSumm[2] / QS, // коэф. боковой силы
            X_f: adxCRSumm[0] / adxSumm[0], // коорд. центра давлений - X
            X_f: adxCRSumm[1] / adxSumm[1], // коорд. центра давлений - Y
            X_f: adxCRSumm[2] / adxSumm[2], // коорд. центра давлений - Z
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
        const {P, k} = flow
        const result = new Array(nMach)
        result.forEach(resLine => {resLine = new Array(nAlpha)})

        for(let i = 0; i < nMach; i++) {
            const Mach = MV[i]
            const Qpress = 0.5 * k * P * Mach * Mach
            const {NuMax, ThMax} = GasDynamics.getThMax(Mach, k)
            
            for(let j = 0; j < nAlpha; j++) {
                const alpha = AV[j]
                const adxMachAlpha = GasDynamics.calcSinglePoint(Qpress, ThMax, NuMax, Mach, flow, alpha, betha)
                result[i][j] = adxMachAlpha
            }
        }

        return result
    }
}

module.exports = AeroModel