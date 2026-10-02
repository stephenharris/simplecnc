export function getDepthColor(depth: number, maxDepth: number): string {
    const depthRatio = Math.min(Math.max(depth / maxDepth, 0), 1)
    const lightness = 80 * (1 - depthRatio); // Full depth is black, shallow depth is light grey
    return `hsl(0, 0%, ${lightness}%)`
}