import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { ContourOffsetter } from './contour-offsetter'
import { createGcodeZip, generateGcode, isClosedContour, sanitizeOperationName } from './generator'
import { toMachinePoint } from './helpers'
import { SvgPathFlattener } from './path-flattener'
import { createImportedObjects } from '../utils/svg'
import type { CutSettings, Stock, SvgObject } from '../types/cnc'

const stock: Stock = { width: 100, height: 100, depth: 2 }
const makeObject = (overrides: Omit<Partial<SvgObject>, 'cut'> & { cut?: Partial<CutSettings> } = {}): SvgObject => {
  const { cut, ...objectOverrides } = overrides
  return {
    id: 1,
    name: 'square.svg / path 1',
    operationName: 'Outline plate',
    src: '',
    pathData: 'M 0 0 L 10 0 L 10 10 L 0 10 Z',
    viewBoxWidth: 10,
    viewBoxHeight: 10,
    width: 10,
    height: 10,
    x: 20,
    y: 30,
    rotation: 0,
    lockedProportions: true,
    svg: '',
    ...objectOverrides,
    cut: {
      operation: 'cut-on-path',
      bitId: '1',
      depth: 1.2,
      feedRate: 600,
      plungeRate: 250,
      depthPerPass: 0.7,
      ...cut,
    },
  }
}

describe('gcode generator', () => {
  it('identifies closed contours with a repeated endpoint', () => {
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }])).toBe(true)
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0.3 }])).toBe(false)
  })

  it('rejects open and underspecified contours', () => {
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(false)
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }])).toBe(false)
  })

  it('retains the endpoint of a short curve that closes a contour', () => {
    const [contour] = new SvgPathFlattener().flatten('M 0 0 L 1 0 Q 0.1 0.1 0 0 Z')

    expect(isClosedContour(contour)).toBe(true)
  })

  it('sanitizes operation names for filenames', () => {
    expect(sanitizeOperationName('  Outside / Sign #1  ')).toBe('outside-sign-1')
    expect(sanitizeOperationName('')).toBe('operation')
  })

  it('emits bottom-left coordinates and stepped depth passes', () => {
    const gcode = generateGcode(makeObject(), stock)
    expect(gcode).toContain('G21')
    expect(gcode).toContain('G90')
    expect(gcode).toContain('G0 X20.000 Y40.000')
    expect(gcode).toContain('; Pass depth: 0.700 mm')
    expect(gcode).toContain('G1 Z-1.200 F250')
    expect(gcode).toContain('G0 Z5.000')
    expect(gcode.endsWith('M2\n')).toBe(true)
  })

  it('emits center-origin coordinates relative to the stock center', () => {
    const gcode = generateGcode(makeObject(), { ...stock, origin: 'center' })

    expect(gcode).toContain('origin: center of stock')
    expect(gcode).toContain('G0 X-30.000 Y-10.000')
    expect(gcode).toContain('G0 X0 Y0')
  })

  it('uses each cut operation’s feed, plunge, and depth-per-pass settings', () => {
    const gcode = generateGcode(makeObject({
      cut: { feedRate: 850, plungeRate: 125, depthPerPass: 0.4 },
    }), stock)

    expect(gcode).toContain('; Stepdown: 0.40 mm')
    expect(gcode).toContain('G1 Z-0.400 F125')
    expect(gcode).toContain('G1 X30.000 Y40.000 F850')
    expect(gcode).toContain('; Pass depth: 0.800 mm')
  })

  it('keeps snowman paths at their individual imported scale', () => {
    const snowmanBody = makeObject({
      name: 'snowman.svg / path 2',
      operationName: 'snowman path 2',
      pathData: 'M 12.836 5.144 L 186.495 295.387 Z',
      viewBoxWidth: 200,
      viewBoxHeight: 300,
      pathBoundsX: 12.836,
      pathBoundsY: 5.144,
      pathBoundsWidth: 173.659,
      pathBoundsHeight: 290.243,
      width: 86.8295,
      height: 145.1215,
      x: 30,
      y: 40,
      cut: { depth: 0.7 },
    })
    const firstPoint = toMachinePoint({ x: 12.836, y: 5.144 }, snowmanBody)

    expect(firstPoint).toEqual({ x: 30, y: 185.1215 })
    expect(generateGcode(snowmanBody, { width: 400, height: 300, depth: 12 })).toContain('G0 X30.000 Y185.121')
  })

  it('applies imported SVG group transforms before mapping the path to the object size', () => {
    const transformedFlower = makeObject({
      pathData: 'M 4 2 L 104 2 L 104 202 L 4 202 Z',
      viewBoxWidth: 10,
      viewBoxHeight: 20,
      pathBoundsWidth: 10,
      pathBoundsHeight: 20,
      width: 10,
      height: 20,
      x: 20,
      y: 30,
      svg: '<svg data-path-bounds="5.4 7.2 10 20"><g transform="matrix(0.1 0 0 0.1 5 7)"><path /></g></svg>',
    })
    const gcode = generateGcode(transformedFlower, stock)
    const points = gcode.split('\n')
      .filter((line) => line.startsWith('G1 X'))
      .map((line) => line.match(/X(-?\d+(?:\.\d+)?) Y(-?\d+(?:\.\d+)?)/)!)
      .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))

    expect(Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x))).toBe(10)
    expect(Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y))).toBe(20)
    expect(Math.min(...points.map((point) => point.x))).toBe(20)
    expect(Math.max(...points.map((point) => point.y))).toBe(50)
  })

  it('normalizes imported path coordinates to a local bounding-box origin', () => {
    const [object] = createImportedObjects([
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300" data-parent-viewbox="0 0 200 300" data-path-bounds="12.836 5.144 173.659 290.243"><path d="M 12.836 5.144 L 186.495 295.387 Z" /></svg>`,
    ], 'snowman', 2)

    expect(object.pathData).toBe('M 0 0 L 173.659 290.243 Z')
    expect(object.pathBoundsX).toBe(0)
    expect(object.pathBoundsY).toBe(0)
    expect(object.pathBoundsWidth).toBeCloseTo(173.659)
    expect(object.pathBoundsHeight).toBeCloseTo(290.243)
    expect(object.x).toBeCloseTo(6.418)
    expect(object.y).toBeCloseTo(2.3065)
  })

  it('applies cutter-radius offsets for closed inside and outside cuts', () => {
    const inside = generateGcode(makeObject({ cut: { operation: 'cut-inside' } }), stock)
    const outside = generateGcode(makeObject({ cut: { operation: 'cut-outside' } }), stock)
    expect(inside).toContain('G1 X21.588 Y38.413')
    expect(outside).toContain('G1 X31.588 Y40.000')
  })

  it('keeps pocket offsets inward when the source contour winding is reversed', () => {
    const reversed = generateGcode(makeObject({ cut: { operation: 'pocket' }, pathData: 'M 0 0 L 0 10 L 10 10 L 10 0 Z' }), stock)
    expect(reversed).toContain('G1 Z-0.700 F250')
    expect(reversed).not.toContain('G1 X18.413 Y41.588')
  })

  it('starts pocketing at the middle and proceeds outward through concentric contours', () => {
    const pocket = generateGcode(makeObject({ cut: { operation: 'pocket' }, width: 40, height: 40, viewBoxWidth: 40, viewBoxHeight: 40, pathData: 'M 0 0 L 40 0 L 40 40 L 0 40 Z' }), stock)
    const contourStarts = pocket
      .split('\n')
      .filter((line) => line.startsWith('G0 X') && !line.startsWith('G0 X0'))
      .map((line) => {
        const values = line.match(/-?\d+(?:\.\d+)?/g) ?? []
        return { x: Number(values[1]), y: Number(values[2]) }
      })

    expect(contourStarts.length).toBeGreaterThan(1)
    expect(contourStarts[0].x).toBeLessThan(contourStarts.at(-1)?.x ?? 0)
    expect(contourStarts[0].y).toBeLessThan(contourStarts.at(-1)?.y ?? 0)
  })

  it('cuts each disconnected pocket feature through all depths before starting the next', () => {
    const pocket = generateGcode(makeObject({
      cut: { operation: 'pocket', bitId: '2', depth: 1.4, depthPerPass: 0.7 },
      width: 40,
      height: 15,
      viewBoxWidth: 40,
      viewBoxHeight: 15,
      pathData: 'M 0 0 L 15 0 L 15 15 L 0 15 Z M 25 0 L 40 0 L 40 15 L 25 15 Z',
    }), stock)
    const passDepths = pocket
      .split('\n')
      .filter((line) => line.startsWith('; Pass depth:'))
      .map((line) => line.match(/\d+\.\d+/)?.[0])

    expect(passDepths).toEqual(['0.700', '1.400', '0.700', '1.400'])
  })

  it('preserves internal holes while pocketing the filled region', () => {
    const pocket = new ContourOffsetter().pocket([
      [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 40 }, { x: 0, y: 40 }, { x: 0, y: 0 }],
      [{ x: 10, y: 10 }, { x: 10, y: 30 }, { x: 30, y: 30 }, { x: 30, y: 10 }, { x: 10, y: 10 }],
    ], 4, 0.5)
    const holeContours = pocket.filter((contour) => {
      const signedArea = contour.reduce((area, point, index) => {
        const next = contour[(index + 1) % contour.length]
        return area + point.x * next.y - next.x * point.y
      }, 0) / 2
      return signedArea < 0
    })

    expect(holeContours.length).toBeGreaterThan(0)
    expect(Math.min(...holeContours.flatMap((contour) => contour.map((point) => point.x)))).toBeLessThan(10)
  })

  it('uses the conical tool width at each depth when pocketing', () => {
    const pocket = generateGcode(makeObject({
      cut: { operation: 'pocket', bitId: '3', depth: 1.2, depthPerPass: 0.7 },
    }), stock)

    expect(pocket).toContain('G1 X20.123 Y39.877 F600')
    expect(pocket).toContain('G1 X20.212 Y39.788 F600')
    expect(pocket).not.toContain('X21.588')
  })

  it('uses the conical tool width at the cut depth for inside and outside contours', () => {
    const inside = generateGcode(makeObject({
      cut: { operation: 'cut-inside', bitId: '3' },
    }), stock)
    const outside = generateGcode(makeObject({
      cut: { operation: 'cut-outside', bitId: '3' },
    }), stock)

    expect(inside).toContain('G1 X20.123 Y39.877 F600')
    expect(outside).toContain('G1 X19.877 Y40.000 F600')
  })

  it('adds a final pocket pass at full depth with a tighter step-over', () => {
    const pocket = generateGcode(makeObject({
      cut: {
        operation: 'pocket',
        depth: 1.2,
        depthPerPass: 0.7,
        stepOver: 50,
        finalPassStepOver: 10,
      },
      pathData: 'M 0 0 L 15 0 L 15 15 L 0 15 Z',
      width: 15,
      height: 15,
      viewBoxWidth: 15,
      viewBoxHeight: 15,
    }), stock)

    expect(pocket).toContain('; Final pass with step over 10%')
    expect((pocket.match(/; Final pass with step over 10%/g) ?? []).length).toBe(1)
    expect(pocket).toContain('G1 Z-1.200 F250')
    expect(pocket.match(/G1 Z-1\.200 F250/g)?.length).toBeGreaterThanOrEqual(1)
  })

  it('creates one zip file per object', async () => {
    const blob = await createGcodeZip([makeObject(), makeObject({ id: 2, operationName: 'Pocket base' }), makeObject({ id: 3, operationName: 'Engrave label' })], stock)
    const zip = await JSZip.loadAsync(blob)
    expect(Object.keys(zip.files).sort()).toEqual(['engrave-label.nc', 'outline-plate.nc', 'pocket-base.nc'])
    expect(await zip.file('outline-plate.nc')?.async('string')).toContain('square.svg / path 1')
    expect(await zip.file('pocket-base.nc')?.async('string')).toContain('; SimpleCNC / Pocket base')
  })
})
