"use client"

import { useState, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, TransformControls } from '@react-three/drei'
import * as THREE from 'three'

const initialColors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff']

function Cube({ position, color, index, debugMode, isSelected, onSelect, dimensions, setDimensions }) {
  const mesh = useRef()

  useEffect(() => {
    if (mesh.current) {
      mesh.current.scale.set(dimensions.width, dimensions.height, dimensions.depth)
    }
  }, [dimensions])

  const handleTransformChange = () => {
    if (mesh.current) {
      const newPosition = mesh.current.position.toArray()
      setDimensions(index, { ...dimensions, position: newPosition })
    }
  }

  return (
    <>
      {debugMode && isSelected ? (
        <TransformControls object={mesh} mode="translate" onObjectChange={handleTransformChange}>
          <mesh
            position={position}
            ref={mesh}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(index)
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </TransformControls>
      ) : (
        <mesh
          position={position}
          ref={mesh}
          onClick={(e) => {
            e.stopPropagation()
            if (debugMode) {
              onSelect(index)
            } else {
              setDimensions(index, { ...dimensions, color: initialColors[Math.floor(Math.random() * initialColors.length)] })
            }
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
    </>
  )
}

function Base() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial color="#cccccc" />
    </mesh>
  )
}

function Scene({ debugMode, selectedCube, setSelectedCube, cubeDimensions, setCubeDimensions, rotationLocked }) {
  const { scene } = useThree()
  const orbitControlsRef = useRef()

  useEffect(() => {
    const axes = new THREE.AxesHelper(5)
    if (debugMode) {
      scene.add(axes)
    } else {
      scene.remove(axes)
    }
    return () => scene.remove(axes)
  }, [debugMode, scene])

  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enableRotate = !rotationLocked
    }
  }, [rotationLocked])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      {cubeDimensions.map((dimensions, index) => (
        <Cube
          key={index}
          position={dimensions.position}
          color={dimensions.color}
          index={index}
          debugMode={debugMode}
          isSelected={selectedCube === index}
          onSelect={setSelectedCube}
          dimensions={dimensions}
          setDimensions={(index, newDimensions) => {
            setCubeDimensions(prev => {
              const newDims = [...prev]
              newDims[index] = newDimensions
              return newDims
            })
          }}
        />
      ))}
      <Base />
      <OrbitControls ref={orbitControlsRef} enablePan={true} enableZoom={true} enableRotate={!rotationLocked} />
    </>
  )
}

export default function CubesEditor() {
  const [debugMode, setDebugMode] = useState(false)
  const [selectedCube, setSelectedCube] = useState(null)
  const [cubeDimensions, setCubeDimensions] = useState(
    initialColors.map((color, index) => ({
      width: 1,
      height: 1,
      depth: 1,
      color,
      position: [
        (index % 3) * 2 - 2,
        0.5,
        Math.floor(index / 3) * 2 - 1
      ]
    }))
  )
  const [editDimensions, setEditDimensions] = useState({ width: 1, height: 1, depth: 1, color: '#ffffff', position: [0, 0, 0] })
  const [rotationLocked, setRotationLocked] = useState(false)

  useEffect(() => {
    if (selectedCube !== null) {
      setEditDimensions(cubeDimensions[selectedCube])
    }
  }, [selectedCube, cubeDimensions])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault()
        setRotationLocked(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleApplyDimensions = () => {
    if (selectedCube !== null) {
      setCubeDimensions(prev => {
        const newDims = [...prev]
        newDims[selectedCube] = editDimensions
        return newDims
      })
    }
  }

  const handleSaveProject = () => {
    const projectData = JSON.stringify(cubeDimensions)
    const blob = new Blob([projectData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cube_project.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full h-screen relative">
      <Canvas camera={{ position: [5, 5, 5], fov: 60 }}>
        <Scene 
          debugMode={debugMode} 
          selectedCube={selectedCube} 
          setSelectedCube={setSelectedCube}
          cubeDimensions={cubeDimensions}
          setCubeDimensions={setCubeDimensions}
          rotationLocked={rotationLocked}
        />
      </Canvas>
      <div className="absolute top-4 left-4 space-y-4">
        <label className="flex items-center space-x-2 text-white bg-gray-800 px-3 py-2 rounded-md">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => {
              setDebugMode(e.target.checked)
              if (!e.target.checked) setSelectedCube(null)
            }}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
          <span>Modo Debug</span>
        </label>
        {debugMode && selectedCube !== null && (
          <div className="bg-gray-800 p-3 rounded-md text-white space-y-2">
            <p>Editar cubo {selectedCube + 1}:</p>
            <div className="space-y-1">
              <label className="flex items-center">
                Ancho:
                <input
                  type="number"
                  value={editDimensions.width}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, width: parseFloat(e.target.value) }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Alto:
                <input
                  type="number"
                  value={editDimensions.height}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, height: parseFloat(e.target.value) }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Profundidad:
                <input
                  type="number"
                  value={editDimensions.depth}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, depth: parseFloat(e.target.value) }))}
                  className="ml-2 w-20 text-black px-1"
                />
              </label>
              <label className="flex items-center">
                Color:
                <input
                  type="color"
                  value={editDimensions.color}
                  onChange={(e) => setEditDimensions(prev => ({ ...prev, color: e.target.value }))}
                  className="ml-2 w-20 h-8"
                />
              </label>
            </div>
            <button
              onClick={handleApplyDimensions}
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
            >
              Aplicar
            </button>
          </div>
        )}
        <button
          onClick={handleSaveProject}
          className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600 transition-colors"
        >
          Guardar Proyecto
        </button>
      </div>
      <div className="absolute bottom-4 left-4 text-white bg-gray-800 px-3 py-2 rounded-md">
        <p>Instrucciones:</p>
        <ul className="list-disc list-inside">
          <li>Activa el modo Debug para interactuar</li>
          <li>Haz clic en un cubo para seleccionarlo</li>
          <li>Edita las dimensiones y el color, luego haz clic en Aplicar</li>
          <li>Arrastra el cubo para moverlo (la posición se guarda al aplicar)</li>
          <li>Desactiva el modo Debug para cambiar colores aleatoriamente</li>
          <li>Presiona ESPACIO para bloquear/desbloquear la rotación de la escena</li>
          <li>Haz clic en "Guardar Proyecto" para descargar el estado actual</li>
        </ul>
      </div>
      <div className={`absolute top-4 right-4 px-3 py-2 rounded-md ${rotationLocked ? 'bg-red-500' : 'bg-green-500'}`}>
        Rotación: {rotationLocked ? 'Bloqueada' : 'Desbloqueada'}
      </div>
    </div>
  )
}