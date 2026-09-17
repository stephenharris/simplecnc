import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { createGcodeZip, generateGcode, isClosedContour, sanitizeOperationName } from './generator'
import { toMachinePoint } from './helpers'
import { createImportedObjects } from '../utils/svg'
import type { Stock, SvgObject } from '../types/cnc'

const stock: Stock = { width: 100, height: 100, depth: 2 }
const makeObject = (overrides: Partial<SvgObject> = {}): SvgObject => ({
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
  operation: 'cut-on-path',
  bitId: '2-flute-spiral-flat-nose-1-8',
  depth: 1.2,
  lockedProportions: true,
  ...overrides,
})

describe('gcode generator', () => {
  it('identifies closed contours with a repeated endpoint', () => {
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0 }])).toBe(true)
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 0.3 }])).toBe(false)
  })

  it('rejects open and underspecified contours', () => {
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(false)
    expect(isClosedContour([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }])).toBe(false)
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
      depth: 0.7,
    })
    const firstPoint = toMachinePoint({ x: 12.836, y: 5.144 }, snowmanBody)

    expect(firstPoint).toEqual({ x: 30, y: 185.1215 })
    expect(generateGcode(snowmanBody, { width: 400, height: 300, depth: 12 })).toContain('G0 X30.000 Y185.121')
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
    const inside = generateGcode(makeObject({ operation: 'cut-inside' }), stock)
    const outside = generateGcode(makeObject({ operation: 'cut-outside' }), stock)
    expect(inside).toContain('G1 X21.588 Y38.413')
    expect(outside).toContain('G1 X31.588 Y40.000')
  })

  it('keeps pocket offsets inward when the source contour winding is reversed', () => {
    const reversed = generateGcode(makeObject({ operation: 'pocket', pathData: 'M 0 0 L 0 10 L 10 10 L 10 0 Z' }), stock)
    expect(reversed).toContain('G1 Z-0.700 F250')
    expect(reversed).not.toContain('G1 X18.413 Y41.588')
  })

  it('starts pocketing at the middle and proceeds outward through concentric contours', () => {
    const pocket = generateGcode(makeObject({ operation: 'pocket', width: 40, height: 40, viewBoxWidth: 40, viewBoxHeight: 40, pathData: 'M 0 0 L 40 0 L 40 40 L 0 40 Z' }), stock)
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

  it('creates one zip file per object', async () => {
    const blob = await createGcodeZip([makeObject(), makeObject({ id: 2, operationName: 'Pocket base' }), makeObject({ id: 3, operationName: 'Engrave label' })], stock)
    const zip = await JSZip.loadAsync(blob)
    expect(Object.keys(zip.files).sort()).toEqual(['engrave-label.nc', 'outline-plate.nc', 'pocket-base.nc'])
    expect(await zip.file('outline-plate.nc')?.async('string')).toContain('square.svg / path 1')
    expect(await zip.file('pocket-base.nc')?.async('string')).toContain('; SimpleCNC / Pocket base')
  })
})
