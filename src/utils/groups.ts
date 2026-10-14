import type { SvgObject } from '../types/cnc'
import { AxisAlignedBoundingBox } from './geometry'

const transformGroupMember = (group: SvgObject, member: SvgObject): SvgObject => {
  const center = {
    x: group.x + group.width / 2,
    y: group.y + group.height / 2,
  }
  const memberCenter = {
    x: group.x + member.x + member.width / 2,
    y: group.y + member.y + member.height / 2,
  }
  const angle = group.rotation * Math.PI / 180
  const offsetX = memberCenter.x - center.x
  const offsetY = memberCenter.y - center.y
  const rotatedCenter = {
    x: center.x + offsetX * Math.cos(angle) - offsetY * Math.sin(angle),
    y: center.y + offsetX * Math.sin(angle) + offsetY * Math.cos(angle),
  }

  return {
    ...member,
    x: rotatedCenter.x - member.width / 2,
    y: rotatedCenter.y - member.height / 2,
    rotation: member.rotation + group.rotation,
  }
}

/** Expands a group to its constituent objects using the group's current transform. */
export const getGroupMembersInWorldSpace = (object: SvgObject): SvgObject[] => {
  if (!object.groupedObjects) return [{ ...object }]
  return object.groupedObjects.flatMap((member) =>
    getGroupMembersInWorldSpace(transformGroupMember(object, member)),
  )
}

export const createGroupedObject = (objects: SvgObject[], existingObjects: SvgObject[]): SvgObject => {
  if (objects.length < 2) throw new Error('At least two objects are required to create a group.')

  const bounds = new AxisAlignedBoundingBox(objects).getBounds()
  const first = objects[0]
  const usedIds = new Set(existingObjects.map((object) => object.id))
  let id = Math.max(Date.now(), ...usedIds) + 1
  while (usedIds.has(id)) id += 1
  const groupedObjects = objects.flatMap(getGroupMembersInWorldSpace).map((member) => ({
    ...member,
    x: member.x - bounds.x,
    y: member.y - bounds.y,
  }))

  return {
    ...first,
    id,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    cut: { ...first.cut },
    groupedObjects,
  }
}

export const ungroupObject = (object: SvgObject): SvgObject[] =>
  object.groupedObjects ? getGroupMembersInWorldSpace(object) : [object]

export const scaleGroupedObjects = (objects: SvgObject[], scaleX: number, scaleY: number): SvgObject[] =>
  objects.map((object) => ({
    ...object,
    x: object.x * scaleX,
    y: object.y * scaleY,
    width: object.width * scaleX,
    height: object.height * scaleY,
    ...(object.groupedObjects
      ? { groupedObjects: scaleGroupedObjects(object.groupedObjects, scaleX, scaleY) }
      : {}),
  }))
