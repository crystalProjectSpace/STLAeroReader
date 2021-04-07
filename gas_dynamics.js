'use strict'
/**
* @decription Получить актуальное число Маха
* @param {Number} V - скорость невозмущенного потока
* @param {Number} Asn - скорость звука в невозмущенном потоке
* @return {Number}
*/
const getMach = function(V, Asn) {
	return V / Asn
}
/**
* @decription Получить скоростной напор
* @param {Number} V - скорость невозмущенного потока
* @param {Number} Ro - плотность невозмущенного потока
* @return {Number}
*/
const getQ = function(V, Ro) {
	return 0.5 * Ro * V * V
}
/**
* @decription Разность между углом отклонения потока и углом скачка уплотнения
* @param {Number} M  число M невозмущенного потока
* @param {Number} Th предполагаемый угол скачка уплотнения
* @param {Number} k  коэффициент адиабаты
* @param {Number} Nu угол клина, на котором образуется скачок
* @return {Number}
*/
const deltaTh = function(M, Th, k, Nu) {
	const M2 = M * M
	const STH = Math.sin(Th)
	const STH_2 = STH * STH
	const C_2TH = Math.cos(2 * Th)
	const TTH = Math.tan(Th)
	const TNU = Math.tan(Nu)
	return TNU - 2 * (M2 * STH_2 - 1) / (TTH * (M2 * (k + C_2TH) + 2))	
}
/**
* @decription Максимальный допустимый угол присоединенного скачка при заданном числе M
* @param {Number} M  число M невозмущенного потока
* @param {Number} k  коэффициент адиабаты
* @return {{NuMax: Number, ThMax}} - максимальный угол клина, на котором возможен присоединенный СУ + максимальный возможный угол СУ
*/
const getThMax = function(M, k) {
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
}
/**
* @decription Получить преобразование потока в течении разрежения (течение Првндтля-Майера, см.Краснов.1. стр.267)
* @param {Number} M  число M невозмущенного потока
* @param {Number} Betha угол между направлением потока и плоскостью
* @param {Number} k  коэффициент адиабаты
* @return {Object}
*/
const rareify = function(M, Betha, k) {
	const M_ = 1/(1/M - 0.5 * (k - 1) * Betha)
	const dT2 = (1/(k - 1) + 0.5 * M * M )/(1/(k - 1) + 0.5 * M_ * M_ )
	const dP2 = dT2 ** (k/(k - 1))
	const dRo2 = dT2 ** (1/(k - 1))
	
	return ({
		M: M_,	// число M после разрежения
		dT2,	// отношение температуры после к температуре до
		dP2,	// -давление-
		dRo2	// -плотность-
	})
}

const kAir = 1.4
const testNu = 10 / 57.3
const Mtest = 1.8
const DTH = 0.025 / 57.3
/**
* @decription Решение уравнения косого скачка уплотнения методом Ньютона
* @param {Number} M  число M невозмущенного потока
* @param {Number} k  коэффициент адиабаты
* @param {Number} Nu угол клина, на котором образуется скачок
* @return {Number} Результирующий угол скачка
*/
const testNewton = function(M, k, Nu) {
	let ThStart = Nu
	let delta = deltaTh(M, ThStart, k, Nu)
	let derivD = (deltaTh(M, ThStart + DTH, k, Nu) - delta)/DTH
	let ThNext = ThStart - delta / derivD
	
	while(Math.abs(ThNext - ThStart) > 5E-4) {
		ThStart = ThNext
		delta = deltaTh(M, ThStart, k, Nu)
		derivD = (deltaTh(M, ThStart + DTH, k, Nu) - delta)/DTH
		ThNext = ThStart - delta / derivD
	}
	
	return ThNext
}
/**
* @decription Найти угол отсоединенного скачка
* @param {Number} ThMax  Максимальный угол присоединенного скачка
* @param {Number} Nu  угол клина
* @param {Number} NuMax Максимальный угол клина, на котором возможен присоединенный скачок
* @return {Number} Результирующий угол скачка
*/
const overCritTh = function(ThMax, Nu, NuMax) {
	const PI_05 = Math.PI * 0.5
	return ThMax + (Nu - NuMax) * (PI_05 - ThMax)/ (PI_05 - NuMax)
}
/**
* @decription Отношение давление после скачка к давлению невозмущенного потока
* @param {Number} M  число M невозмущенного потока
* @param {Number} k  коэффициент адиабаты
* @param {Number} Th угол скачка
* @return {Number} Отношения давления после к давлению перед скачком
*/
const shockTransform = function(M, k, Th) {
	const M2 = M * M
	const STH = Math.sin(Th)
	const dP = (2 * k * M2 * STH * STH - k + 1) / (k + 1)
	return dP
}
/**
* @decription Для набора углов местного клина получить последовательность коэффициентов давления
* @param {Array.<Number>} M  число M невозмущенного потока
* @param {Number} M  число M невозмущенного потока
* @param {Number} k  коэффициент адиабаты
* @return {Array.<{Th: Number, dP: Number}>} Вектор с углами скачков и коэффициентам роста давления
*/
const multiCalc = function(NuV, M, k) {
	const {ThMax, NuMax} = getThMax(M, k)
	const nV = NuV.length
	const result = []
	for(let i = 0; i < nV; i++) {
		const Nu = NuV[i]
		const Th = Nu > NuMax ? overCritTh(ThMax, Nu, NuMax) : testNewton(M, k, Nu)
		const dP = shockTransform(M, k, Th)
		result.push({Th, dP })
	}
	return result
}

const NuTest = [20/57.3, 5/57.3, 15/57.3, 30/57.3]
const test_1 = multiCalc(NuTest, 1.8, kAir)
const test_2 = multiCalc(NuTest, 6, kAir)

console.log(test_1.forEach(({Th, dP}) => { console.log(`TH: ${Th}; dP: ${dP}`) }))
console.log(test_2.forEach(({Th, dP}) => { console.log(`TH: ${Th}; dP: ${dP}`) }))

console.log(rareify(2, 5/57.3, 1.4))

console.log( (2 * 5/57.3)/(Math.sqrt(5*5 - 1)))