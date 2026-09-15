import type { SvgObject } from '../types/cnc'

/** Reads the SVG viewBox or intrinsic dimensions and maps them to a 100 mm import width. */
export const getSvgSize = (svg: string) => {
  const { width: sourceWidth, height: sourceHeight } = getSvgCoordinateSize(svg)
  const targetWidth = 100
  return { width: targetWidth, height: Math.max(12, targetWidth * sourceHeight / sourceWidth) }
}

const getSvgCoordinateSize = (svg: string) => {
  const viewBox = svg.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  const width = svg.match(/\bwidth=["']([\d.]+)(?:px|mm)?["']/i)
  const height = svg.match(/\bheight=["']([\d.]+)(?:px|mm)?["']/i)
  return { width: Number(viewBox?.[1] ?? width?.[1] ?? 100), height: Number(viewBox?.[2] ?? height?.[1] ?? 100) }
}

/** Extracts one standalone, renderable SVG for every path while preserving shared coordinates and group transforms. */
export const extractPathSvgs = (svg: string) => {
  const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
  const root = document.documentElement
  const paths = Array.from(root.querySelectorAll('path'))
  if (paths.length === 0) return [svg]
  const attributes = ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'fill-rule', 'clip-rule']
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
    return `<svg xmlns="http://www.w3.org/2000/svg"${attributes}>${content}</svg>`
  })
}

/** Builds the initial editable object state for each imported standalone path. */
export const createImportedObjects = (pathSvgs: string[], fileName: string, stockDepth: number): SvgObject[] => pathSvgs.map((pathSvg, index) => ({
  id: Date.now() + Math.random() + index,
  name: `${fileName} / path ${index + 1}`,
  operationName: `${fileName} path ${index + 1}`,
  src: URL.createObjectURL(new Blob([pathSvg], { type: 'image/svg+xml' })),
  pathData: new DOMParser().parseFromString(pathSvg, 'image/svg+xml').querySelector('path')?.getAttribute('d') ?? '',
  viewBoxWidth: getSvgCoordinateSize(pathSvg).width,
  viewBoxHeight: getSvgCoordinateSize(pathSvg).height,
  ...getSvgSize(pathSvg),
  x: 24,
  y: 24,
  rotation: 0,
  operation: 'cut-on-path',
  depth: Math.min(3, stockDepth),
}))
