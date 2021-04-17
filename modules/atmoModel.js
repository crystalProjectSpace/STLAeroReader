'use strict'
// Для Земли используется стандартная атомсфера ГОСТ 4401-81
// объект-интерполятор
const AtmoModel = function() {
	this.atmoData = null
	this.index = 0
	this.k = 0
	this.R = 0
	
	this.initAtmo = ({atmosphere, k, R}) => {
		this.atmoData = atmosphere
		this.k = k
		this.R = R
	}
	
	/**
	* @description Задать актуальный индекс для интерполяции высоты
	*/
	this.setupIndex = H0 => {
		while(this.atmoData[this.index + 1][0] < H0) {
			this.index++
		}
	}
	/**
	* @description проверить актуальность индекса
	*/		
	this.checkIndex = H => {
		if(H > this.atmoData[this.index + 1][0]) {
			this.index++
		} else if(H < this.atmoData[this.index][0]) {
			this.index--
		}
	}
	/**
	 * @description Формула Сазерленда для получения динамической вязкости воздуха
	 * @param {Number} T 
	 * @param {Number} Ro 
	 * @returns {Number}
	 */
	this.viscositySutherland = (T, Ro) => {
		return 1.458E-6 * (T**1.5) / ((110.4 + T) * Ro)
	}
	/**
	* @description Получить параметры атмосферы (плотность, температура, скорость звука, плотность, коэф.адиабаты, дин.вязкость)
	*/
	this.getAtmo = H => {
		const atmoH_0 = this.atmoData[this.index]
		const atmoH_1 = this.atmoData[this.index + 1]
		const hRel = (H - atmoH_0[0]) / (atmoH_1[0] - atmoH_0[0])
			
		const result =  {
			P: atmoH_0[2] + (atmoH_1[2] - atmoH_0[2]) * hRel,
			T: atmoH_0[1] + (atmoH_1[1] - atmoH_0[1]) * hRel,
			aSn: atmoH_0[4] + (atmoH_1[4] - atmoH_0[4]) * hRel,
			Ro: atmoH_0[3] + (atmoH_1[3] - atmoH_0[3]) * hRel,
			k: this.k
		}

		const viscosity = this.viscositySutherland(result.T, result.Ro)
		const vChaotic = Math.sqrt(2 * result.T * this.R)

		return {...result, viscosity, vChaotic}
	}
}

module.exports = AtmoModel