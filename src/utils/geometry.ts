import type { SvgObject } from '../types/cnc'

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export class AxisAlignedBoundingBox {
  protected objects: SvgObject[]
  protected minX: number = Infinity;
  protected maxX: number = -Infinity;
  protected minY: number = Infinity;
  protected maxY: number = -Infinity;
  protected width: number = 0;
  protected height: number = 0;


  constructor(objects: SvgObject[]) {
    this.objects = objects;
    this.computeBoundingBox();
  }

  // Computes the axis-aligned bounding box of the current objects, taking into account their rotation.
  private computeBoundingBox() {
    
    let boundingBox = this.objects.reduce((acc, object) => {
      const angle = object.rotation * Math.PI / 180
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);


      const boundingWidth = Math.abs(object.width * cos) + Math.abs(object.height * sin);
      const boundingHeight = Math.abs(object.width * sin) + Math.abs(object.height * cos);

      acc.minX = Math.min(acc.minX, object.x + object.width / 2 - boundingWidth / 2)
      acc.minY = Math.min(acc.minY, object.y + object.height / 2 - boundingHeight / 2)
      acc.maxX = Math.max(acc.maxX, object.x + object.width / 2 - boundingWidth / 2 + boundingWidth)
      acc.maxY = Math.max(acc.maxY, object.y + object.height / 2 - boundingHeight / 2 + boundingHeight)

      return acc

    }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    this.minX = boundingBox.minX 
    this.maxX = boundingBox.maxX
    this.minY = boundingBox.minY
    this.maxY = boundingBox.maxY
    this.width = this.maxX - this.minX
    this.height =  this.maxY - this.minY
  }

  // Applies the given changes to the bounding box and scales/translates the objects accordingly.
  // And returns the modified objects.
  transform(changes: Partial<SvgObject>): SvgObject[] {

    const to = {
      x: changes.x ?? this.getMinX(),
      y: changes.y ?? this.getMinY(),
      width: changes.width,
      height: changes.height,
    }

    const lockedProportions = this.objects.some((item) => item.lockedProportions);
      
    this.objects = this.objects.map((object) => {
      const relativeX = object.x - this.minX
      const relativeY = object.y - this.minY

      let scaleX = this.width > 0 && changes.width ? changes.width / this.width : 1
      let scaleY = this.height > 0  && changes.height ? changes.height / this.height : 1

      if(changes.width && lockedProportions) {
        scaleY = scaleX;
      } else if(changes.height && lockedProportions) {
        scaleX = scaleY;
      }

      object.x = to.x + relativeX * scaleX
      object.y = to.y + relativeY * scaleY
      object.width = object.width * scaleX
      object.height = object.height * scaleY

      return object;
    });

    this.computeBoundingBox();

    return this.objects
  }

  getWidth(): number {
    return this.width
  }

  getHeight(): number {
    return this.height
  }

  getMinX(): number {
    return this.minX
  }

  getMinY(): number {
    return this.minY
  }

}

export const rotateSelectionAroundPoint = (items: SvgObject[], center: { x: number, y: number }, angleDegrees: number): SvgObject[] => {

  const angle = angleDegrees * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  return items.map((item) => {
    const itemCenter = { x: item.x + item.width / 2, y: item.y + item.height / 2 }
    const offsetX = itemCenter.x - center.x
    const offsetY = itemCenter.y - center.y
    const rotatedCenter = {
      x: center.x + offsetX * cos - offsetY * sin,
      y: center.y + offsetX * sin + offsetY * cos,
    }

    return {
      ...item,
      x: rotatedCenter.x - item.width / 2,
      y: rotatedCenter.y - item.height / 2,
      rotation: item.rotation + angleDegrees,
    }
  })
}
