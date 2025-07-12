import { ref } from 'vue'

// HSL颜色转RGB辅助函数
export const hslToRgb = (h, s, l) => {
  let r, g, b
  
  if (s === 0) {
    r = g = b = l // 灰度
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }
  
  return [r, g, b]
}

// 生成颜色
export const generateColors = (count) => {
  const colors = []
  // 使用黄金比例分割法生成均匀分布的色相值
  const goldenRatioConjugate = 0.618033988749895
  let h = Math.random() // 随机起始色相
  
  // 生成色相均匀分布的颜色
  for (let i = 0; i < count; i++) {
    h = (h + goldenRatioConjugate) % 1
    
    // 简化饱和度和亮度计算，减少随机数生成
    const s = 0.65
    const l = i % 2 === 0 ? 0.6 : 0.5
    
    // 转换HSL为十六进制颜色代码
    const rgb = hslToRgb(h, s, l)
    const hex = '#' + 
      rgb.map(x => {
        const hex = Math.round(x * 255).toString(16)
        return hex.length === 1 ? '0' + hex : hex
      }).join('')
    
    colors.push(hex)
  }
  return colors
}

// 减少颜色生成数量，节省内存
export const COLORS = generateColors(150)

// 坐标转换缓存系统
export function createCoordinateCache(mapStore) {
  const coordinateCache = ref(new Map())
  const CACHE_SIZE = 2000 // 缓存大小限制减小到2000，减少内存占用
  
  function cachedMeterToPixelX(meterX) {
    const cacheKey = `x:${meterX}`
    if (coordinateCache.value.has(cacheKey)) {
      return coordinateCache.value.get(cacheKey)
    }
    
    const pixelX = mapStore.meterToPixelX(meterX)
    
    // 管理缓存大小
    if (coordinateCache.value.size > CACHE_SIZE) {
      // 如果缓存超过大小限制，清空一半缓存
      const keys = Array.from(coordinateCache.value.keys())
      for (let i = 0; i < keys.length / 2; i++) {
        coordinateCache.value.delete(keys[i])
      }
    }
    
    coordinateCache.value.set(cacheKey, pixelX)
    return pixelX
  }
  
  function cachedMeterToPixelY(meterY) {
    const cacheKey = `y:${meterY}`
    if (coordinateCache.value.has(cacheKey)) {
      return coordinateCache.value.get(cacheKey)
    }
    
    const pixelY = mapStore.meterToPixelY(meterY)
    
    // 管理缓存大小
    if (coordinateCache.value.size > CACHE_SIZE) {
      // 缓存管理已在X函数中处理，这里不重复
      return pixelY
    }
    
    coordinateCache.value.set(cacheKey, pixelY)
    return pixelY
  }
  
  function clearCache() {
    coordinateCache.value.clear()
  }
  
  return {
    coordinateCache,
    cachedMeterToPixelX,
    cachedMeterToPixelY,
    clearCache
  }
}

// 添加requestIdleCallback的polyfill
export function setupIdleCallback() {
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = (callback) => {
      return setTimeout(() => {
        const start = Date.now()
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
        })
      }, 1)
    }
    
    window.cancelIdleCallback = (id) => clearTimeout(id)
  }
} 