import { describe, expect, it } from 'vitest'
import type { Stock, SvgObject } from '../types/cnc'
import { createImportedObjects } from './svg'
import { deserializeProject, serializeProject } from './project'

describe('project persistence', () => {
  it('serializes and restores stock and objects without losing metadata', () => {
    const project: { stock: Stock, objects: SvgObject[] } = {
      stock: { width: 400, height: 300, depth: 12 },
      objects: [
        {
          id: 42,
          name: 'demo.svg / path 1',
          operationName: 'demo path 1',
          src: 'data:image/svg+xml;base64,PHN2Zw==',
          pathData: 'M 0 0 L 10 0 L 10 10 Z',
          viewBoxWidth: 10,
          viewBoxHeight: 10,
          width: 10,
          height: 10,
          x: 20,
          y: 30,
          rotation: 0,
          operation: 'cut-on-path' as const,
          bitId: '2-flute-spiral-flat-nose-1-8',
          depth: 1.2,
          lockedProportions: true,
          svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M 0 0 L 10 0 L 10 10 Z" /></svg>',
        },
      ],
    }

    const saved = serializeProject(project)
    const roundTrip = deserializeProject(saved)

    expect(roundTrip.version).toBe(1)
    expect(roundTrip.stock).toEqual(project.stock)
    expect(roundTrip.objects).toEqual(project.objects)
    expect(roundTrip.savedAt).toEqual(expect.any(String))
  })

  it('stores imported SVG thumbnails as data URLs so they survive reloads', () => {
    const [object] = createImportedObjects([
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" data-parent-viewbox="0 0 20 20" data-path-bounds="0 0 20 20"><path d="M 0 0 L 20 0 L 20 20 Z" /></svg>',
    ], 'demo', 12)

    expect(object.src).toMatch(/^data:image\/svg\+xml/)
  })
})
