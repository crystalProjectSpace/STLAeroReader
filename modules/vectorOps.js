'use strict'

const Vector = {
    NORTH: [0, 1E20, 0],
    /**
     *  @description модуль вектора 
     */
    absV: function(U) {
        return Math.sqrt(U[0]*U[0] + U[1]*U[1] + U[2]*U[2])
    },
    /**
    * @description сумма векторов
    */
    vectSumm: function(U, V) {
        return [
            U[0] + V[0],
            U[1] + V[1],
            U[2] + V[2]
        ]
    },
    /**
    * @description вычитание векторов
    */
    vectSubt: function(U, V) {
        return [
            U[0] - V[0],
            U[1] - V[1],
            U[2] - V[2]
        ]
    },
    /**
    * @description умножить вектор на скаляр
    */
    vectByScal: function(U, k) {
        return [
            U[0] * k,
            U[1] * k,
            U[2] * k
        ]
    },
    /**
    * @description скалярное произведение
    */
    dotProduct: function (U, V) {
        return U[0]*V[0] + U[1]*V[1] + U[2]*V[2]
    },
    /**
    * @description векторное произведение
    */
    crossProduct: function(U, V) {
        return [
            U[1] * V[2] - U[2] * V[1],
            U[2] * V[0] - U[0] * V[2],
            U[0] * V[1] - U[1] * V[0]
        ]
    },
    /**
     * @description Построить плоскость по трем точкам
     */
    points2plane: function(U, V, W) {
        const UV = Vector.vectSubt(U, V)
        const WV = Vector.vectSubt(W, V)
        const norm = Vector.crossProduct(UV, WV)
        const dNorm = 1 / Vector.absV(norm)
        
        return {
            point: V,
            norm: [
                norm[0] * dNorm,
                norm[1] * dNorm,
                norm[2] * dNorm
            ]
        }
    },
    norm2line: function(U, L) {
        const t = Vector.dotProduct(Vector.vectSubt(L.point, U), L.direct) / Vector.dotProduct(L.direct, L.direct)

        return Vector.vectSumm(L.point, Vector.vectByScal(L.direct, t))
    },
    /**
    * @description плоскость местного горизонта
    */
    tangentPlane: function(U) {
        const absU = Vector.absV(U)

        return {
            point: [U[0], U[1], U[2]],
            norm: [
                U[0]/absU,
                U[1]/absU,
                U[2]/absU
            ]
        }
    },
    /**
    * @description модуль угла между двумя векторами
    */
    angleBetween: function(U, V) {
        const cross = Vector.crossProduct(U, V)
        const sign = Math.sign(Vector.dotProduct([0, 1, 1], cross))
        return sign * Math.acos(Vector.dotProduct(U, V)/ (Vector.absV(U) * Vector.absV(V)))
    },
    /**
    * @description спроецировать точку на плоскость
    */
    point2plane: function(U, plane) {
        const t = Vector.dotProduct(
            plane.norm,
            Vector.vectSubt(plane.point, U)
        ) / Vector.dotProduct(plane.norm, plane.norm)

        return Vector.vectSumm(U, Vector.vectByScal(plane.norm, t))
    },
    /**
    * @description декартовы координаты -> сферические
    */
    decart2sphere :function(U) {
        const rad = Vector.absV(U)
        const rad_planar = Math.sqrt(U[0] * U[0] + U[2] * U[2])
        const W = Math.asin(U[1] / rad)
        const L0 = Math.asin(U[0] / rad_planar)
        const L = (U[0] > 0) ?
            (U[2] > 0 ? L0 : Math.PI - L0) :
            (U[2] < 0 ? Math.PI - L0 : 2 * Math.PI + L0) 
            
        return {W, L}
    },
    /**
     * @description определить угол на поверхности сферы между двумя точками
     * @param {Number} W1 широта точки 1
     * @param {Number} L1 долгота точки 1
     * @param {Number} W1 широта точки 2
     * @param {Number} L1 долгота точки 2
     * @return {Number}
     */
    sphereDelta: function(W1, L1, W2, L2) {
        const CW1 = Math.cos(W1)
        const CL1 = Math.cos(L1)
        const SW1 = Math.sin(W1)
        const SL1 = Math.sin(L1)
        const CW2 = Math.cos(W2)
        const CL2 = Math.cos(L2)
        const SW2 = Math.sin(W2)
        const SL2 = Math.sin(L2)
        
        return Vector.angleBetween(
            [CW1 * SL1, SW1, CW1 * CL1],
            [CW2 * SL2, SW2, CW2 * CL2]
        )
    },
    /**
    * @description  сферические координаты -> декартовы
    */
    sphere2decart: function(W, L, H) {
        const cw = Math.cos(W)
        
        return [		
            H * cw * Math.sin(L),
            H * Math.sin(W),
            H * cw * Math.cos(L)
        ]
    },
    /**
    * @description  сферические координаты -> декартовы
    */
    azimuth: function(V, crd) {
        const localHoryzon = Vector.tangentPlane(crd)
        const localNorth = Vector.point2plane(Vector.NORTH, localHoryzon)
        const vHoryzon = Vector.point2plane(V, localHoryzon)

        return Vector.angleBetween(Vector.vectSubt(vHoryzon, crd), Vector.vectSubt(localNorth, crd))
    },
    /**
     * @description Умножить матрицу на вектор
     * @param {Array.<Array.<Number>>} M - матрица
     * @param {Array.<Number>} U - вектор
     * @returns {Array.<Number>}
     */
    vect2matrix: function(M, U) {
        return [
            M[0][0] * U[0] + M[0][1] * U[1] + M[0][2] * U[2],
            M[1][0] * U[0] + M[1][1] * U[1] + M[1][2] * U[2],
            M[2][0] * U[0] + M[2][1] * U[1] + M[2][2] * U[2]
        ]
    },
    /**
     * @description Матрица поворота на произвольный угол вокруг произвольный оси
     * @param {Array.<Number>} U - единичный вектор оси разворота
     * @param {Number} Th угол разворота
     * @returns {Array.<Number>}
     */
    arbitRotation: function(U, Th) {
        const CTH = Math.cos(Th)
        const STH = Math.sin(Th)
        const _CTH = 1 - CTH
        const XY = U[0] * U[1]
        const XZ = U[0] * U[2]
        const YZ = U[1] * U[2]
        const XX = U[0] * U[0]
        const YY = U[1] * U[1]
        const ZZ = U[2] * U[2]

        return [
            [CTH + XX * _CTH,       XY * _CTH - U[2]*STH,   XZ * _CTH + U[1]*STH],
            [XY * _CTH + U[2]*STH,  CTH + YY * _CTH,        YZ * _CTH - U[0] * STH],
            [XZ * _CTH - U[1]*STH,  YZ * _CTH + U[0] * STH, CTH + ZZ * _CTH]
        ]
    },
    /**
     * @description получить площадь треугольника
     * @param {Array.<Number>} точка-1
     * @param {Array.<Number>} точка-2
     * @param {Array.<Number>} точка-3
     * @return {Number} площадь треугольника
     */
    heronArea: function(A, B, C) {
        const AB = Vector.absV(Vector.vectSubt(B, A))
        const BC = Vector.absV(Vector.vectSubt(B, C))
        const AC = Vector.absV(Vector.vectSubt(A, C))

        const p = 0.5 * (AB + BC + AC)

        return Math.sqrt(p * (p - AB) * (p - BC) * (p - AC))
    },
    triCenter: function(A, B, C) {
        return [
            ((A[0] + B[0]) * 0.5 + C[0]) * 0.5,
            ((A[1] + B[1]) * 0.5 + C[1]) * 0.5,
            ((A[2] + B[2]) * 0.5 + C[2]) * 0.5, 
        ]
    }
}

module.exports = Vector