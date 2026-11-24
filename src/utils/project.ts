import type { Stock, SvgObject } from '../types/cnc'

export type ProjectFile = {
  version: number
  title: string
  stock: Stock
  objects: SvgObject[]
  savedAt?: string
}

export const PROJECT_STORAGE_KEY = 'simplecnc-project-v1'
export const DEFAULT_PROJECT_TITLE = 'Untitled project'
type ProjectData = Pick<ProjectFile, 'stock' | 'objects'> & Partial<Pick<ProjectFile, 'title'>>

export const serializeProject = (project: ProjectData): string => JSON.stringify({
  version: 1,
  savedAt: new Date().toISOString(),
  title: project.title?.trim() || DEFAULT_PROJECT_TITLE,
  stock: project.stock,
  objects: project.objects,
}, null, 2)

export const deserializeProject = (raw: string): ProjectFile => {
  try {
    const parsed = JSON.parse(raw) as Partial<ProjectFile>
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Project payload is empty.')
    }

    if (!parsed.stock || !Array.isArray(parsed.objects)) {
      throw new Error('Project file is missing the stock or object list.')
    }

    return {
      version: 1,
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : DEFAULT_PROJECT_TITLE,
      stock: {
        ...parsed.stock,
        origin: parsed.stock.origin === 'center' ? 'center' : 'bottom-left',
      },
      objects: parsed.objects as SvgObject[],
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
    }
  } catch {
    throw new Error('Could not load that project file. Please choose a valid SimpleCNC project export.')
  }
}

export const saveProjectToStorage = (project: ProjectData) => {
  if (typeof window === 'undefined' || !('localStorage' in window)) return
  window.localStorage.setItem(PROJECT_STORAGE_KEY, serializeProject(project))
}

export const clearProjectFromStorage = () => {
  if (typeof window === 'undefined' || !('localStorage' in window)) return
  window.localStorage.removeItem(PROJECT_STORAGE_KEY)
}

export const loadProjectFromStorage = (): ProjectFile | null => {
  if (typeof window === 'undefined' || !('localStorage' in window)) return null

  const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY)
  if (!raw) return null

  try {
    return deserializeProject(raw)
  } catch {
    return null
  }
}
