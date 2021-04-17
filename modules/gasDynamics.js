'use strict'

/**
 * @description Аппроксимация erf, нужна для расчета разреженного потока
 * @param {Number} x 
 * @returns 
 */
 const erf = function(x) {
    const sign = Math.sign(x)
    const _x = Math.abs(x)
    const t = 1 / (1 + 0.47047 * _x)
    const x_2 = _x * _x
    const t_2 = t * t
    const t_3 = t_2 * t
    const C1 = Math.pow(2.71828, -x_2)

    return sign * (1 - (0.3480242 * t - 0.0958798 * t_2 + 0.7478556 * t_3) * C1)
}

const GasDynamics = {
	/**
	* @decription Разность между углом отклонения потока и углом скачка уплотнения
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} Th предполагаемый угол скачка уплотнения
	* @param {Number} k  коэффициент адиабаты
	* @param {Number} Nu угол клина, на котором образуется скачок
	* @return {Number}
	*/
	deltaTh: function(M, Th, k, Nu) {
		const M2 = M * M
		const STH = Math.sin(Th)
		const STH_2 = STH * STH
		const C_2TH = Math.cos(2 * Th)
		const TTH = Math.tan(Th)
		const TNU = Math.tan(Nu)
		return TNU - 2 * (M2 * STH_2 - 1) / (TTH * (M2 * (k + C_2TH) + 2))	
	},
	/**
	* @decription Максимальный допустимый угол присоединенного скачка при заданном числе M
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} k  коэффициент адиабаты
	* @return {{NuMax: Number, ThMax}} - максимальный угол клина, на котором возможен присоединенный СУ + максимальный возможный угол СУ
	*/
	getThMax: function(M, k) {
		const M2 = M * M
		const M4 = M2 * M2
		const C1 = (k + 1) * M2 - 4
		const C2 = (k + 1) * (k + 1) * M4 + 8 * M2 * (k * k - 1) + 16
		const C3 = 4 * M2 * k
		
		const ThMax = Math.asin(Math.sqrt((C1 + Math.sqrt(C2))/C3))
		const STH = Math.sin(ThMax)
		return {
			NuMax: Math.atan(2 * (M2 * STH * STH - 1) / ((M2 * (Math.cos(2 * ThMax) + k) + 2) * Math.tan(ThMax))),
			ThMax
		}
	},
	/**
	* @decription Получить преобразование потока в течении разрежения (течение Првндтля-Майера, см.Краснов.1. стр.267)
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} Betha угол между направлением потока и плоскостью
	* @param {Number} k  коэффициент адиабаты
	* @return {Object}
	*/
	rareify: function(M, Betha, k) {
		if(1/M > Betha) {
			const M_ = 1/(1/M - 0.5 * (k - 1) * Betha) 
			const dT2 = (1/(k - 1) + 0.5 * M * M )/(1/(k - 1) + 0.5 * M_ * M_ )
			const dP2 = dT2 ** (k/(k - 1))
			return dP2
		} else {
			return 0
		}
	},


	DTH: 0.0004363001745,

	SHOCK_LIMIT: 15,
	/**
	* @decription Решение уравнения косого скачка уплотнения методом Ньютона
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} k  коэффициент адиабаты
	* @param {Number} Nu угол клина, на котором образуется скачок
	* @return {Number} Результирующий угол скачка
	*/
	testNewton: function(M, k, Nu) {
		let ThStart = Nu
		let delta = GasDynamics.deltaTh(M, ThStart, k, Nu)
		let derivD = (GasDynamics.deltaTh(M, ThStart + GasDynamics.DTH, k, Nu) - delta)/GasDynamics.DTH
		let ThNext = ThStart - delta / derivD
		
		while(Math.abs(ThNext - ThStart) > 5E-4) {
			ThStart = ThNext
			delta = GasDynamics.deltaTh(M, ThStart, k, Nu)
			derivD = (GasDynamics.deltaTh(M, ThStart + GasDynamics.DTH, k, Nu) - delta)/GasDynamics.DTH
			ThNext = ThStart - delta / derivD
		}
		
		return ThNext
	},
	/**
	 * @description Коэффициент местного избыточного давления на основе метода Ньютона
	*/
	newtonKinematic: function(M, k, Nu) {
		const M_STH = M * Math.sin(Nu)
		return k * M_STH * M_STH + 1
	},
	/**
	* @decription Найти угол отсоединенного скачка
	* @param {Number} ThMax  Максимальный угол присоединенного скачка
	* @param {Number} Nu  угол клина
	* @param {Number} NuMax Максимальный угол клина, на котором возможен присоединенный скачок
	* @return {Number} Результирующий угол скачка
	*/
	overCritTh: function(ThMax, Nu, NuMax) {
		const PI_05 = Math.PI * 0.5
		return ThMax + (Nu - NuMax) * (PI_05 - ThMax)/ (PI_05 - NuMax)
	},
	/**
	* @decription Отношение давление после скачка к давлению невозмущенного потока
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} k  коэффициент адиабаты
	* @param {Number} Th угол скачка
	* @return {Number} Отношения давления после к давлению перед скачком
	*/
	shockTransform: function(M, k, Th) {
		const M2 = M * M
		const STH = Math.sin(Th)
		const dP = (2 * k * M2 * STH * STH - k + 1) / (k + 1)
		return dP
	},
	/**
	 * @description Заготовка для расчета потока со скольжением (Kn >> 1E-3)
	 */
	getSlipFlow: function(Nu, M, k, aSn, vChaotic) {
		if(Math.abs(Nu) > 0.001) {
			const M2 = M * M
			const V0 = M * aSn
			const vR = V0
			const SNU = Math.sin(Nu)
			const betha = V0 * SNU / vChaotic
			const _PI = Math.sqrt(Math.PI)

			const K_V = vR * vChaotic / (V0 * V0)
			const K_ERF = 1 + erf(betha)
			const K_XP = Math.pow(2.71828, - (betha * betha))

			const K1 = SNU * SNU / (betha * _PI)
			const K2 = Math.sign(Nu) * K_XP
			const K3 = _PI * (betha + 0.5 / betha) * K_ERF
	
			return 0.5 * k * M2 * (K1 * (K2 + K3) + 0.5 * K_V * (K_XP + _PI * betha * K_ERF))
		} else {
			return 1
		}
	}, 
	/**
	* @decription Для набора углов местного клина получить последовательность коэффициентов давления
	* @param {Array.<Number>} M  число M невозмущенного потока
	* @param {Number} M  число M невозмущенного потока
	* @param {Number} k  коэффициент адиабаты
	* @return {Array.<{Th: Number, dP: Number}>} Вектор с углами скачков и коэффициентам роста давления
	*/
	getDeltaPressure: function(ThMax, NuMax, Nu, M, k) {
		if(Math.abs(Nu) > 0.005) {
			if( Nu > 0) {
				if( M < GasDynamics.SHOCK_LIMIT) {
					const Th = Nu > NuMax ? GasDynamics.overCritTh(ThMax, Nu, NuMax) : GasDynamics.testNewton(M, k, Nu)
					return GasDynamics.shockTransform(M, k, Th)
				} else {
					return GasDynamics.newtonKinematic(M, k, Nu)
				}
			} else {
				return GasDynamics.rareify(M, -Nu, k)
			}
		} else {
			return 1
		}
	}
}

module.exports = GasDynamics