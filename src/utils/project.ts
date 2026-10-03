import type { Stock, SvgObject } from '../types/cnc'

export type ProjectFile = {
  version: number
  stock: Stock
  objects: SvgObject[]
  savedAt?: string
}

export const PROJECT_STORAGE_KEY = 'simplecnc-project-v1'

export const serializeProject = (project: Pick<ProjectFile, 'stock' | 'objects'>): string => JSON.stringify({
  version: 1,
  savedAt: new Date().toISOString(),
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
      stock: parsed.stock,
      objects: parsed.objects as SvgObject[],
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined,
    }
  } catch {
    throw new Error('Could not load that project file. Please choose a valid SimpleCNC project export.')
  }
}

export const saveProjectToStorage = (project: Pick<ProjectFile, 'stock' | 'objects'>) => {
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
