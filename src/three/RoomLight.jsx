// Soft "photo studio room" lighting for COCO's generated fur textures (self-contained, no HDR download).
// Without it the baked grey fur reads almost black under a few direct lights.
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export default function RoomLight({ intensity = 1 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const prev = scene.environment, prevI = scene.environmentIntensity;
    scene.environment = env; scene.environmentIntensity = intensity;
    return () => { scene.environment = prev; scene.environmentIntensity = prevI; env.dispose(); pm.dispose(); };
  }, [gl, scene, intensity]);
  return null;
}
