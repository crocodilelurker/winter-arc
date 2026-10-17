import { useEffect, useRef, useState, useCallback } from 'react'
import {
  getEffectiveOutgoingIds,
  getTopicColor,
  type Task,
} from './data'

type Node = {
  id: string
  task: Task
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

type Edge = {
  source: string
  target: string
}

type Props = {
  tasks: Task[]
  selectedTaskId: string | null
  onSelectTask: (taskId: string) => void
}

export default function GraphView({ tasks, selectedTaskId, onSelectTask }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Transform state: pan & zoom
  const transformRef = useRef({ x: 0, y: 0, scale: 1 })
  const [, setRenderTrigger] = useState(0)

  // Simulation state
  const nodesRef = useRef<Map<string, Node>>(new Map())
  const edgesRef = useRef<Edge[]>([])
  const animFrameRef = useRef<number | null>(null)
  const isRunningRef = useRef<boolean>(true)

  // Interaction state
  const hoveredNodeIdRef = useRef<string | null>(null)
  const draggedNodeIdRef = useRef<string | null>(null)
  const isPanningRef = useRef<boolean>(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const mouseMovedRef = useRef<boolean>(false)

  // Synchronize nodes & edges
  useEffect(() => {
    const currentNodes = nodesRef.current
    const newNodes = new Map<string, Node>()
    const width = containerRef.current?.clientWidth || 600
    const height = containerRef.current?.clientHeight || 450
    const centerX = width / 2
    const centerY = height / 2

    tasks.forEach((task, idx) => {
      const existing = currentNodes.get(task.id)
      // Uniform node radius (no weight influence on graph)
      const radius = 17
      // If completed, use vibrant emerald green, else topic color
      const color = task.completed ? '#10b981' : getTopicColor(task.topic)

      if (existing) {
        newNodes.set(task.id, {
          ...existing,
          task,
          radius,
          color,
        })
      } else {
        // Spread evenly in a circle around center
        const angle = (idx / Math.max(1, tasks.length)) * Math.PI * 2
        const dist = 70 + Math.random() * 90
        newNodes.set(task.id, {
          id: task.id,
          task,
          x: centerX + Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
          y: centerY + Math.sin(angle) * dist + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          radius,
          color,
        })
      }
    })

    nodesRef.current = newNodes

    // Extract all edges (explicit + wikilinks)
    const newEdges: Edge[] = []
    const edgeSet = new Set<string>()

    tasks.forEach((task) => {
      const outgoing = getEffectiveOutgoingIds(task, tasks)
      outgoing.forEach((targetId) => {
        if (newNodes.has(targetId) && targetId !== task.id) {
          const key = `${task.id}->${targetId}`
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            newEdges.push({ source: task.id, target: targetId })
          }
        }
      })
    })

    edgesRef.current = newEdges
    wakeSimulation()
  }, [tasks])

  const wakeSimulation = useCallback(() => {
    isRunningRef.current = true
    if (!animFrameRef.current) {
      animFrameRef.current = requestAnimationFrame(simulate)
    }
  }, [])

  const simulate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const nodes = Array.from(nodesRef.current.values())
    const edges = edgesRef.current
    const width = canvas.width / (window.devicePixelRatio || 1)
    const height = canvas.height / (window.devicePixelRatio || 1)
    const centerX = width / 2
    const centerY = height / 2

    let totalKineticEnergy = 0

    // 1. Repulsion between all node pairs
    for (let i = 0; i < nodes.length; i++) {
      const n1 = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j]
        const dx = n2.x - n1.x
        const dy = n2.y - n1.y
        const distSq = dx * dx + dy * dy || 1
        const dist = Math.sqrt(distSq)

        const minDist = n1.radius + n2.radius + 45
        const force = (minDist * minDist * 45) / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        if (draggedNodeIdRef.current !== n1.id) {
          n1.vx -= fx * 0.04
          n1.vy -= fy * 0.04
        }
        if (draggedNodeIdRef.current !== n2.id) {
          n2.vx += fx * 0.04
          n2.vy += fy * 0.04
        }
      }
    }

    // 2. Spring attraction along edges
    const idealLength = 110
    for (const edge of edges) {
      const s = nodesRef.current.get(edge.source)
      const t = nodesRef.current.get(edge.target)
      if (!s || !t) continue

      const dx = t.x - s.x
      const dy = t.y - s.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const displacement = dist - idealLength
      const force = displacement * 0.038
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      if (draggedNodeIdRef.current !== s.id) {
        s.vx += fx
        s.vy += fy
      }
      if (draggedNodeIdRef.current !== t.id) {
        t.vx -= fx
        t.vy -= fy
      }
    }

    // 3. Center gravity & damping
    const damping = 0.85
    for (const node of nodes) {
      if (draggedNodeIdRef.current === node.id) continue

      const toCenterX = centerX - node.x
      const toCenterY = centerY - node.y
      node.vx += toCenterX * 0.0035
      node.vy += toCenterY * 0.0035

      node.vx *= damping
      node.vy *= damping
      node.x += node.vx
      node.y += node.vy

      totalKineticEnergy += node.vx * node.vx + node.vy * node.vy
    }

    draw()

    if (totalKineticEnergy > 0.015 || draggedNodeIdRef.current) {
      animFrameRef.current = requestAnimationFrame(simulate)
    } else {
      isRunningRef.current = false
      animFrameRef.current = null
    }
  }, [])

  // Obsidian-styled Canvas drawing
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    ctx.save()
    ctx.clearRect(0, 0, width, height)

    // Deep Obsidian canvas background with subtle gradient
    const bgGrad = ctx.createRadialGradient(
      width / 2,
      height / 2,
      50,
      width / 2,
      height / 2,
      Math.max(width, height),
    )
    bgGrad.addColorStop(0, '#09090b')
    bgGrad.addColorStop(1, '#050507')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, width, height)

    // Apply pan & zoom
    ctx.translate(transformRef.current.x, transformRef.current.y)
    ctx.scale(transformRef.current.scale, transformRef.current.scale)

    // Draw ambient Obsidian grid dots
    const scale = transformRef.current.scale
    const gridSize = 32
    const startX = -transformRef.current.x / scale - 100
    const startY = -transformRef.current.y / scale - 100
    const endX = startX + width / scale + 200
    const endY = startY + height / scale + 200

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    const firstX = Math.floor(startX / gridSize) * gridSize
    const firstY = Math.floor(startY / gridSize) * gridSize
    for (let gx = firstX; gx < endX; gx += gridSize) {
      for (let gy = firstY; gy < endY; gy += gridSize) {
        ctx.fillRect(gx, gy, 1.2, 1.2)
      }
    }

    const nodesMap = nodesRef.current
    const edges = edgesRef.current
    const hoveredId = hoveredNodeIdRef.current
    const selectedId = selectedTaskId

    // Connected neighbors set
    const connectedToActive = new Set<string>()
    if (hoveredId || selectedId) {
      const activeId = hoveredId || selectedId
      connectedToActive.add(activeId!)
      for (const edge of edges) {
        if (edge.source === activeId) connectedToActive.add(edge.target)
        if (edge.target === activeId) connectedToActive.add(edge.source)
      }
    }

    const hasFocus = Boolean(hoveredId || selectedId)

    // 1. Draw Edges
    for (const edge of edges) {
      const s = nodesMap.get(edge.source)
      const t = nodesMap.get(edge.target)
      if (!s || !t) continue

      const isConnected =
        (hoveredId && (edge.source === hoveredId || edge.target === hoveredId)) ||
        (selectedId && (edge.source === selectedId || edge.target === selectedId))

      const bothCompleted = s.task.completed && t.task.completed

      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)

      if (isConnected) {
        ctx.strokeStyle = '#38bdf8' // active cyan neon
        ctx.lineWidth = 2.4
        ctx.globalAlpha = 1.0
      } else if (bothCompleted) {
        ctx.strokeStyle = '#10b981' // green completed path
        ctx.lineWidth = 1.6
        ctx.globalAlpha = hasFocus ? 0.3 : 0.6
      } else if (hasFocus) {
        ctx.strokeStyle = '#334155'
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.15
      } else {
        ctx.strokeStyle = '#475569'
        ctx.lineWidth = 1.2
        ctx.globalAlpha = 0.4
      }
      ctx.stroke()
      ctx.globalAlpha = 1.0

      // Arrow indicator pointing to target
      const angle = Math.atan2(t.y - s.y, t.x - s.x)
      const arrowDist = t.radius + 6
      const arrowX = t.x - Math.cos(angle) * arrowDist
      const arrowY = t.y - Math.sin(angle) * arrowDist
      const arrowLen = isConnected ? 7 : 5

      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle - Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle - Math.PI / 6),
      )
      ctx.lineTo(
        arrowX - arrowLen * Math.cos(angle + Math.PI / 6),
        arrowY - arrowLen * Math.sin(angle + Math.PI / 6),
      )
      ctx.closePath()
      ctx.fillStyle = isConnected ? '#38bdf8' : bothCompleted ? '#10b981' : '#64748b'
      ctx.fill()
    }

    // 2. Draw Nodes
    const nodes = Array.from(nodesMap.values())
    for (const node of nodes) {
      const isHovered = node.id === hoveredId
      const isSelected = node.id === selectedId
      const isNeighbor = connectedToActive.has(node.id)
      const isCompleted = node.task.completed

      let alpha = 1.0
      if (hasFocus && !isNeighbor) {
        alpha = 0.25
      }
      ctx.globalAlpha = alpha

      // Glowing outer ring for hover/selected
      if (isSelected || isHovered) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 7, 0, Math.PI * 2)
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.15)'
        ctx.fill()
        ctx.lineWidth = 2
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#cbd5e1'
        ctx.stroke()
      } else if (isCompleted) {
        // Subtle green halo for completed task
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 4, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'
        ctx.fill()
      }

      // Base Node Circle with Radial Gradient
      const grad = ctx.createRadialGradient(
        node.x - node.radius * 0.3,
        node.y - node.radius * 0.3,
        node.radius * 0.1,
        node.x,
        node.y,
        node.radius,
      )

      if (isCompleted) {
        grad.addColorStop(0, '#34d399') // bright emerald
        grad.addColorStop(1, '#059669') // deep green
      } else {
        grad.addColorStop(0, node.color)
        grad.addColorStop(1, '#0f172a') // deep vignette
      }

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
      ctx.fillStyle = grad
      ctx.fill()

      // Node border
      ctx.lineWidth = isCompleted ? 2.2 : 1.8
      ctx.strokeStyle = isCompleted ? '#10b981' : 'rgba(255, 255, 255, 0.7)'
      ctx.stroke()

      // Render Task Number (#1, #2...) inside the node circle!
      ctx.font = '600 12px Inter, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(node.task.number), node.x, node.y)

      // Completed check badge on top-right of node circle
      if (isCompleted) {
        const badgeX = node.x + node.radius * 0.7
        const badgeY = node.y - node.radius * 0.7
        ctx.beginPath()
        ctx.arc(badgeX, badgeY, 6, 0, Math.PI * 2)
        ctx.fillStyle = '#10b981'
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.2
        ctx.stroke()

        ctx.font = 'bold 8px Inter, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.fillText('✓', badgeX, badgeY)
      }

      // 3. Hover Tooltip only (Names strictly hidden unless hovered)
      if (isHovered) {
        ctx.save()
        ctx.font = '500 12px Inter, -apple-system, sans-serif'
        const label = `#${node.task.number} · ${node.task.title}`
        const metrics = ctx.measureText(label)
        const padX = 12
        const boxW = Math.max(metrics.width + padX * 2, 50)
        const boxH = 26
        const boxX = node.x - boxW / 2
        const boxY = node.y - node.radius - boxH - 8

        // Subtle drop shadow for tooltip
        ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
        ctx.shadowBlur = 10
        ctx.shadowOffsetY = 3

        ctx.beginPath()
        if (typeof (ctx as any).roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, 2)
        } else {
          ctx.rect(boxX, boxY, boxW, boxH)
        }
        ctx.fillStyle = '#121214'
        ctx.fill()

        ctx.shadowColor = 'transparent'
        ctx.lineWidth = 1
        ctx.strokeStyle = isCompleted ? '#38bdf8' : '#27272a'
        ctx.stroke()

        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isCompleted ? '#34d399' : '#ffffff'
        ctx.fillText(label, node.x, boxY + boxH / 2)
        ctx.restore()
      }

      ctx.globalAlpha = 1.0
    }

    ctx.restore()
  }, [selectedTaskId])

  // Canvas size and DPR synchronization
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container) return

      const dpr = window.devicePixelRatio || 1
      const width = container.clientWidth
      const height = container.clientHeight

      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
      }
      draw()
    }

    handleResize()
    const observer = new ResizeObserver(handleResize)
    if (containerRef.current) observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [draw])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX - rect.left
    const clientY = e.clientY - rect.top

    const x = (clientX - transformRef.current.x) / transformRef.current.scale
    const y = (clientY - transformRef.current.y) / transformRef.current.scale
    return { x, y }
  }

  const findNodeAt = (x: number, y: number): Node | null => {
    const nodes = Array.from(nodesRef.current.values())
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      const dx = node.x - x
      const dy = node.y - y
      if (dx * dx + dy * dy <= (node.radius + 8) * (node.radius + 8)) {
        return node
      }
    }
    return null
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e)
    const hitNode = findNodeAt(x, y)
    mouseMovedRef.current = false

    if (hitNode) {
      draggedNodeIdRef.current = hitNode.id
      wakeSimulation()
    } else {
      isPanningRef.current = true
      panStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mouseMovedRef.current = true

    if (draggedNodeIdRef.current) {
      const { x, y } = getCanvasCoords(e)
      const node = nodesRef.current.get(draggedNodeIdRef.current)
      if (node) {
        node.x = x
        node.y = y
        node.vx = 0
        node.vy = 0
        wakeSimulation()
      }
      return
    }

    if (isPanningRef.current) {
      transformRef.current.x = e.clientX - panStartRef.current.x
      transformRef.current.y = e.clientY - panStartRef.current.y
      draw()
      return
    }

    // Check hover
    const { x, y } = getCanvasCoords(e)
    const hit = findNodeAt(x, y)
    const newHover = hit ? hit.id : null
    if (newHover !== hoveredNodeIdRef.current) {
      hoveredNodeIdRef.current = newHover
      if (canvasRef.current) {
        canvasRef.current.style.cursor = newHover ? 'pointer' : 'grab'
      }
      draw()
    }
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const draggedId = draggedNodeIdRef.current
    draggedNodeIdRef.current = null
    isPanningRef.current = false

    // Select node if clicked without dragging
    if (draggedId) {
      const { x, y } = getCanvasCoords(e)
      const hit = findNodeAt(x, y)
      if (hit && hit.id === draggedId) {
        onSelectTask(draggedId)
      }
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88
    const newScale = Math.min(3.2, Math.max(0.3, transformRef.current.scale * zoomFactor))

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    transformRef.current.x = mouseX - (mouseX - transformRef.current.x) * (newScale / transformRef.current.scale)
    transformRef.current.y = mouseY - (mouseY - transformRef.current.y) * (newScale / transformRef.current.scale)
    transformRef.current.scale = newScale

    setRenderTrigger((v) => v + 1)
    draw()
  }

  const resetView = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.width / (window.devicePixelRatio || 1)
    const height = canvas.height / (window.devicePixelRatio || 1)

    const nodes = Array.from(nodesRef.current.values())
    if (nodes.length === 0) {
      transformRef.current = { x: 0, y: 0, scale: 1 }
    } else {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const n of nodes) {
        if (n.x < minX) minX = n.x
        if (n.x > maxX) maxX = n.x
        if (n.y < minY) minY = n.y
        if (n.y > maxY) maxY = n.y
      }
      const spanX = Math.max(200, maxX - minX + 120)
      const spanY = Math.max(200, maxY - minY + 120)
      const scale = Math.min(1.4, Math.max(0.5, Math.min(width / spanX, height / spanY)))
      const midX = (minX + maxX) / 2
      const midY = (minY + maxY) / 2
      transformRef.current = {
        x: width / 2 - midX * scale,
        y: height / 2 - midY * scale,
        scale,
      }
    }
    setRenderTrigger((v) => v + 1)
    draw()
  }

  const jiggle = () => {
    nodesRef.current.forEach((node) => {
      node.vx += (Math.random() - 0.5) * 16
      node.vy += (Math.random() - 0.5) * 16
    })
    wakeSimulation()
  }

  return (
    <div className="graph-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isPanningRef.current = false
          draggedNodeIdRef.current = null
          hoveredNodeIdRef.current = null
          draw()
        }}
        onWheel={handleWheel}
      />

      {tasks.length === 0 && (
        <div className="graph-empty-overlay">
          <p>No tasks to display in the graph yet. Add a task to populate the network.</p>
        </div>
      )}

      <div className="graph-controls">
        <button
          type="button"
          onClick={() => {
            transformRef.current.scale = Math.min(3.2, transformRef.current.scale * 1.25)
            setRenderTrigger((v) => v + 1)
            draw()
          }}
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => {
            transformRef.current.scale = Math.max(0.3, transformRef.current.scale * 0.8)
            setRenderTrigger((v) => v + 1)
            draw()
          }}
          title="Zoom Out"
        >
          −
        </button>
        <button type="button" onClick={resetView} title="Fit to View">
          Fit
        </button>
        <button type="button" onClick={jiggle} title="Re-arrange nodes">
          Reorganize
        </button>
      </div>

      <div className="graph-legend">
        <span>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
        <span>•</span>
        <span>{edgesRef.current.length} {edgesRef.current.length === 1 ? 'connection' : 'connections'}</span>
      </div>
    </div>
  )
}
