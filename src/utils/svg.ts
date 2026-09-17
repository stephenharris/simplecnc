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
  const attributes = ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule']
    .map((name) => root.getAttribute(name) ? ` ${name}="${root.getAttribute(name)}"` : '')
    .join('')
  const serializer = new XMLSerializer()
  return paths.map((path) => {
    const cleanPath = path.cloneNode(true) as Element
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
export const createImportedObjects = (pathSvgs: string[], fileName: string, stockDepth: number): SvgObject[] => pathSvgs.map((pathSvg, index) => ({
  ...getImportedGeometry(pathSvg),
  id: Date.now() + Math.random() + index,
  name: `${fileName} / path ${index + 1}`,
  operationName: `${fileName} path ${index + 1}`,
  src: URL.createObjectURL(new Blob([pathSvg], { type: 'image/svg+xml' })),
  pathData: new DOMParser().parseFromString(pathSvg, 'image/svg+xml').querySelector('path')?.getAttribute('d') ?? '',
  viewBoxWidth: getSvgCoordinateSize(pathSvg).width,
  viewBoxHeight: getSvgCoordinateSize(pathSvg).height,
  sourceViewBoxX: getSvgCoordinateSize(pathSvg).x,
  sourceViewBoxY: getSvgCoordinateSize(pathSvg).y,
  sourceViewBoxWidth: getSvgCoordinateSize(pathSvg).width,
  sourceViewBoxHeight: getSvgCoordinateSize(pathSvg).height,
  pathBoundsX: readImportMetadata(pathSvg, 'data-path-bounds')?.[0],
  pathBoundsY: readImportMetadata(pathSvg, 'data-path-bounds')?.[1],
  pathBoundsWidth: readImportMetadata(pathSvg, 'data-path-bounds')?.[2],
  pathBoundsHeight: readImportMetadata(pathSvg, 'data-path-bounds')?.[3],
  rotation: 0,
  operation: 'cut-on-path',
  bitId: bits[0].id,
  depth: Math.min(3, stockDepth),
  lockedProportions: true,
}))
