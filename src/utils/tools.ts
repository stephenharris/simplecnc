import tools from '../data/tools.json'

export const toolList = Object.entries(tools).map(([id, tool]) => ({ id, ...tool }))

export const getTool = (id: string) => toolList.find((tool) => tool.id === id)
