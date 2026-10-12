import { useCallback } from 'react'
import type { ChangeEvent } from 'react'
import type { Stock, SvgObject } from '../types/cnc'
import type { ProjectSnapshot } from '../utils/history'
import { deserializeProject, serializeProject } from '../utils/project'

const readFileAsText = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result ?? ''))
  reader.onerror = () => reject(reader.error ?? new Error(`Could not read ${file.name}.`))
  reader.readAsText(file)
})

type UseProjectFilesOptions = {
  stock: Stock
  objects: SvgObject[]
  setProject: (project: ProjectSnapshot) => void
  clearSelection: () => void
}

export function useProjectFiles({ stock, objects, setProject, clearSelection }: UseProjectFilesOptions) {
  const saveProject = useCallback(() => {
    const payload = serializeProject({ stock, objects })
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'simplecnc-project.json'
    link.click()
    URL.revokeObjectURL(url)
  }, [objects, stock])

  const importProject = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    void readFileAsText(file).then((contents) => {
      const importedProject = deserializeProject(contents)
      setProject({ stock: importedProject.stock, objects: importedProject.objects })
      clearSelection()
    }).catch((error: unknown) => {
      window.alert(error instanceof Error ? error.message : 'Could not import that SimpleCNC project file.')
    })
  }, [clearSelection, setProject])

  return { saveProject, importProject }
}
