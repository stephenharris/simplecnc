import { makeAbsolute, parseSVG } from 'svg-path-parser'
import type { SvgObject } from '../types/cnc'
import bits from '../data/bits.json'

/** Reads the SVG viewBox or intrinsic dimensions and maps them to a 100 mm import width. */
export const getSvgSize = (svg: string) => {
  const { width: sourceWidth, height: sourceHeight } = getSvgCoordinateSize(svg)
  const targetWidth = 100
  return { width: targetWidth, height: Math.max(12, targetWidth * sourceHeight / sourceWidth) }
}

const getSvgCoordinateSize = (svg: string) => {
  const viewBox = svg.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  const width = svg.match(/\bwidth=["']([\d.]+)(?:px|mm)?["']/i)
  const height = svg.match(/\bheight=["']([\d.]+)(?:px|mm)?["']/i)
  return { x: Number(viewBox?.[1] ?? 0), y: Number(viewBox?.[2] ?? 0), width: Number(viewBox?.[3] ?? width?.[1] ?? 100), height: Number(viewBox?.[4] ?? height?.[1] ?? 100) }
}

/** Extracts one standalone, renderable SVG for every path while preserving shared coordinates and group transforms. */
export const extractPathSvgs = (svg: string) => {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  const paths = Array.from(root.querySelectorAll('path'))
  if (paths.length === 0) return [svg]
  const rootViewBox = root.getAttribute('viewBox')
  const rootSize = getSvgCoordinateSize(svg)

  // Build a string of all relevant attributes on the root SVG element to preserve in each extracted path SVG.
  // Do not include width/height attributes, as this will be determined by the path.
  const attributes = ['viewBox', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule']
    .map((name) => root.getAttribute(name) ? ` ${name}="${root.getAttribute(name)}"` : '')
    .join('')
  const serializer = new XMLSerializer()
  return paths.map((path) => {
    const cleanPath = path.cloneNode(true) as Element
    cleanPath.setAttribute('fill', 'currentColor');
    cleanPath.setAttribute('style', 'stroke: #000000;stroke-width: 1;');
    Array.from(cleanPath.attributes).filter((attribute) => attribute.name.includes(':')).forEach((attribute) => cleanPath.removeAttribute(attribute.name))
    let content = serializer.serializeToString(cleanPath)
    let parent = path.parentElement
    while (parent && parent !== root) {
      const parentAttributes = Array.from(parent.attributes).filter((attribute) => !attribute.name.includes(':')).map((attribute) => ` ${attribute.name}="${attribute.value}"`).join('')
      content = `<${parent.tagName}${parentAttributes}>${content}</${parent.tagName}>`
      parent = parent.parentElement
    }
    const bounds = getPathBounds(content, rootViewBox, rootSize)
    const pathBounds = `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
    const metadata = ` data-parent-viewbox="${rootSize.x} ${rootSize.y} ${rootSize.width} ${rootSize.height}" data-path-bounds="${pathBounds}"`
    return `<svg xmlns="http://www.w3.org/2000/svg"${attributes}${metadata}>${content}</svg>`
  })
}

const getPathBounds = (content: string, viewBox: string | null, fallback: { width: number, height: number }) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', viewBox ?? `0 0 ${fallback.width} ${fallback.height}`)
  svg.innerHTML = content
  document.body?.appendChild(svg)
  try {
    const box = svg.getBBox()
    return { x: box.x, y: box.y, width: Math.max(box.width, 0.001), height: Math.max(box.height, 0.001) }
  } catch {
    return { x: 0, y: 0, width: fallback.width, height: fallback.height }
  } finally {
    svg.remove()
  }
}

const translatePathData = (pathData: string, dx: number, dy: number) => {
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return pathData

  const format = (value: number) => Number(value.toFixed(6)).toString()
  const commands = makeAbsolute(parseSVG(pathData))

  return commands.map((command) => {
    const shift = (x: number, y: number) => ({ x: Number(format(x - dx)), y: Number(format(y - dy)) })

    switch (command.code) {
      case 'M': {
        const point = shift(command.x, command.y)
        return `M ${point.x} ${point.y}`
      }
      case 'L': {
        const point = shift(command.x, command.y)
        return `L ${point.x} ${point.y}`
      }
      case 'H': return `H ${format(command.x - dx)}`
      case 'V': return `V ${format(command.y - dy)}`
      case 'C': {
        const start = shift(command.x1, command.y1)
        const end = shift(command.x2, command.y2)
        const target = shift(command.x, command.y)
        return `C ${start.x} ${start.y} ${end.x} ${end.y} ${target.x} ${target.y}`
      }
      case 'Q': {
        const control = shift(command.x1, command.y1)
        const target = shift(command.x, command.y)
        return `Q ${control.x} ${control.y} ${target.x} ${target.y}`
      }
      case 'A': {
        const target = shift(command.x, command.y)
        return `A ${format(command.rx)} ${format(command.ry)} ${format(command.xAxisRotation)} ${command.largeArc ? 1 : 0} ${command.sweep ? 1 : 0} ${target.x} ${target.y}`
      }
      case 'Z': return 'Z'
      default: return ''
    }
  }).filter(Boolean).join(' ')
}

const getPathData = (svg: string) => svg.match(/<path\b[^>]*\bd=["']([^"']+)["']/i)?.[1] ?? ''

const normalizeImportedSvg = (svg: string, pathBounds: number[] | undefined, localPathData: string) => {
  if (!pathBounds || pathBounds.length !== 4) return svg

  let normalized = svg.replace(/viewBox=["'][^"']+["']/i, `viewBox="0 0 ${pathBounds[2]} ${pathBounds[3]}"`)
  normalized = normalized.replace(/\s(?:width|height)=["'][^"']+["']/gi, '')
  normalized = normalized.replace(/<path\b([^>]*)\bd=["'][^"']*["']/i, `<path$1 d="${localPathData}"`)
  return normalized
}

const readImportMetadata = (svg: string, name: string) => svg.match(new RegExp(`${name}="([^"]+)"`, 'i'))?.[1].trim().split(/\s+/).map(Number)

const getImportedGeometry = (svg: string) => {
  const bounds = readImportMetadata(svg, 'data-path-bounds')
  const parent = readImportMetadata(svg, 'data-parent-viewbox')
  if (!bounds || bounds.length !== 4 || !parent || parent.length !== 4 || parent[2] <= 0) return { ...getSvgSize(svg), x: 0, y: 0 }
  const scale = 100 / parent[2]
  return {
    width: Math.max(0.001, bounds[2] * scale),
    height: Math.max(0.001, bounds[3] * scale),
    x: (bounds[0] - parent[0]) * scale,
    y: (parent[1] + parent[3] - bounds[1] - bounds[3]) * scale,
  }
}

/** Builds the initial editable object state for each imported standalone path. */
export const createImportedObjects = (pathSvgs: string[], fileName: string, stockDepth: number): SvgObject[] => pathSvgs.map((pathSvg, index) => {
  const pathBounds = readImportMetadata(pathSvg, 'data-path-bounds')
  const originalPathData = getPathData(pathSvg)
  const localPathData = pathBounds && pathBounds.length === 4
    ? translatePathData(originalPathData, pathBounds[0], pathBounds[1])
    : originalPathData

  const normalizedSvg = normalizeImportedSvg(pathSvg, pathBounds, localPathData)

  const defaultViewBox = pathBounds && pathBounds.length === 4 ? { width: pathBounds[2], height: pathBounds[3], x: 0, y: 0 } : getSvgCoordinateSize(pathSvg)

  return {
    ...getImportedGeometry(pathSvg),
    id: Date.now() + Math.random() + index,
    name: `${fileName} / path ${index + 1}`,
    operationName: `${fileName} path ${index + 1}`,
    src: URL.createObjectURL(new Blob([normalizedSvg], { type: 'image/svg+xml' })),
    svg: normalizedSvg,
    pathData: localPathData,
    viewBoxWidth: defaultViewBox.width,
    viewBoxHeight: defaultViewBox.height,
    pathBoundsX: 0,
    pathBoundsY: 0,
    pathBoundsWidth: defaultViewBox.width,
    pathBoundsHeight: defaultViewBox.height,
    rotation: 0,
    operation: 'cut-on-path',
    bitId: bits[0].id,
    depth: Math.min(3, stockDepth),
    lockedProportions: true,
  }
})
