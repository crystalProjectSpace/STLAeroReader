'use strict'

const deltaTh = function(M, Th, k, Nu) {
	const M2 = M * M
	const STH = Math.sin(Th)
	const STH_2 = STH * STH
	const C_2TH = Math.cos(2 * Th)
	const TTH = Math.tan(Th)
	const TNU = Math.tan(Nu)
	return TNU - 2 * (M2 * STH_2 - 1) / (TTH * (M2 * (k + C_2TH) + 2))	
}

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

const kAir = 1.4
const testNu = 10 / 57.3
const Mtest = 1.8
const DTH = 0.025 / 57.3

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
		//console.log(`d: ${(delta * 57.3).toFixed(3)}; Th: ${(ThNext * 57.3).toFixed(3)}`)
	}
	
	return ThNext
}

const overCritTh = function(ThMax, Nu, NuMax) {
	const PI_05 = Math.PI * 0.5
	return ThMax + (Nu - NuMax) * (PI_05 - ThMax)/ (PI_05 - NuMax)
}

const multiCalc = function(NuV, M, k) {
	const {ThMax, NuMax} = getThMax(M, k)
	const nV = NuV.length
	const result = []
	for(let i = 0; i < nV; i++) {
		const Nu = NuV[i]
		const Th = Nu > NuMax ? overCritTh(ThMax, Nu, NuMax) : testNewton(M, k, Nu)
		result.push(Th * 57.3)
	}
	return result
}
const NuTest = [20/57.3, 5/57.3, 15/57.3, 30/57.3]
const test_1 = multiCalc(NuTest, 1.8, kAir)
const test_2 = multiCalc(NuTest, 6, kAir)

console.log(test_1.map(Th => Th.toFixed(2)).join('; '))
console.log(test_2.map(Th => Th.toFixed(2)).join('; '))