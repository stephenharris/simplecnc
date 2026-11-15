import tools from '../data/tools.json'
import type { Tool } from '../types/cnc'

export const toolList: Tool[] = Object.entries(tools).map(([id, tool]) => ({ id, ...tool }))

export const getTool = (id: string) => toolList.find((tool) => tool.id === id)
