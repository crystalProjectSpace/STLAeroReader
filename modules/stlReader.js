'use strict'

const fs = require('fs')

const MODES = { READ: 'r' }
// константы для работы с бинарным STL
const STL = {
	HEADER_BYTES: 80,	// стандартный заголовок 80 символов
	N_TRI_BYTES: 4,		//UInt32 little-endian количество треугольников в модели
	FACET_BYTES: 50,	// количество байт на один треугольник
	NORM_BYTES: 12,		// вектор нормали, 3 значения типа Float32 little-endian
	POINT_BYTES: 12,	// вектор нормали, 3 значения типа Float32 little-endian (в каждойй грани три точки, образующие треугольник)
	CL_BYTES: 2,		// цвет плоскости, UInt16 
	D_NORML: 0,			// сдвиг при чтении нормали 
	D_POINT_1: 12,		// сдвиг при чтении первой точки
	D_POINT_2: 24,		// сдвиг при чтении второй точки
	D_POINT_3: 36		// сдвиг при чтении третьей точки
}

/**
 * @description Преобразовать байт-массив в данные о геометрии
 * @param {Array.<Uint8>} rawBinary массив байтов бинарного файла 
 * @returns {{header: String, nTriangles: Number, traingles: Object}} - заголовк прочтенного файла, количество элемнтарных треугольников и массив треугольников
 */
function getSTLData(rawBinary) {
	const triangles = []
	const header = rawBinary.toString('utf-8', 0, STL.HEADER_BYTES)
	const nTriangles = rawBinary.readUInt32LE(STL.HEADER_BYTES)

	let triangle_offset = STL.HEADER_BYTES + STL.N_TRI_BYTES

	for(let i = 0; i < nTriangles; i++) {

		const facet_buffer = rawBinary.slice(triangle_offset, triangle_offset + STL.FACET_BYTES)

		let delta = 0
		const norm = new Array(3)
		const p1 = new Array(3)
		const p2 = new Array(3)
		const p3 = new Array(3)
		
		for(let j = 0; j < 3; j++) {
			norm[j] = facet_buffer.readFloatLE(STL.D_NORML + delta)
			p1[j] = facet_buffer.readFloatLE(STL.D_POINT_1 + delta)
			p2[j] = facet_buffer.readFloatLE(STL.D_POINT_2 + delta)
			p3[j] = facet_buffer.readFloatLE(STL.D_POINT_3 + delta)
			delta += 4
		}

		triangles.push({
			norm,
			p1,
			p2,
			p3
		})
		
		triangle_offset += STL.FACET_BYTES
	}

	return {
		header,
		nTriangles,
		triangles
	}	
}

/*
Because ASCII STL files can become very large, a binary version of STL exists. A binary STL file has an 80-character header (which is generally ignored, but should never begin with "solid" because that may lead some software to assume that this is an ASCII STL file). Following the header is a 4-byte little-endian unsigned integer indicating the number of triangular facets in the file. Following that is data describing each triangle in turn. The file simply ends after the last triangle.

Each triangle is described by twelve 32-bit floating-point numbers: three for the normal and then three for the X/Y/Z coordinate of each vertex – just as with the ASCII version of STL. After these follows a 2-byte ("short") unsigned integer that is the "attribute byte count" – in the standard format, this should be zero because most software does not understand anything else.[6]

Floating-point numbers are represented as IEEE floating-point numbers and are assumed to be little-endian, although this is not stated in documentation.
	UINT8[80]    – Header                 -     80 bytes                           
	UINT32       – Number of triangles    -      4 bytes

	foreach triangle                      - 50 bytes:
		REAL32[3] – Normal vector             - 12 bytes
		REAL32[3] – Vertex 1                  - 12 bytes
		REAL32[3] – Vertex 2                  - 12 bytes
		REAL32[3] – Vertex 3                  - 12 bytes
		UINT16    – Attribute byte count      -  2 bytes
	end
*/

/**
 * @description получить указатель на файл для дальнейшей обработки
 * @async
 * @param {String} path путь к файлу 
 * @param {String} mode режим работы с файлом
 * @returns {Promise}
 */
const getFileHandler = function(path, mode){
	return new Promise((resolve, reject) => {
		fs.open(path, mode, (status, filePtr) => {
			status ?
				reject(status) :
				resolve(filePtr)
		})
	})
}

module.exports = {
	/**
	 * @description Считать бинарный STL-файл, созданный в Blender, и передать массив треугольников для дальнейшей обработки
	 * @async
	 * @param {String} path путь к обрабатываемому STL-файлу 
	 * @param {Function} geometryConsumer функция - преобразователь геометрии 
	 * @returns {void} промис, успешно завершаемый передачей данных о геометрии объекта
	 */
	readSTL: function(path, geometryConsumer = null) {
		return new Promise((resolve, reject) => {
			fs.stat(path, false, (err, fileStats) => {
				err ? reject(err) : resolve(fileStats)
			})
		})
		.then( fileStats => {
			getFileHandler(path, MODES.READ)
			.then(filePtr => new Promise((resolve, reject) => {
					const readBuff = Buffer.alloc(fileStats.size)
					console.log(`\nbinaries acquired, ${fileStats.size} bytes total;\n`)
					fs.read(filePtr, readBuff, 0, fileStats.size, 0, (err, content) => {
						err ? reject(err) : resolve(readBuff)
					})
				})
			)
			.then(binary => {
					const stl_data = getSTLData(binary)
					const {triangles, nTriangles} = stl_data
					console.log(`model geometry data ready, ${nTriangles} facets total;\n`)
					geometryConsumer(triangles) 
			})
			.catch( err => {
				console.log('fail:')
				console.log(err)
			})
		})
	}
}