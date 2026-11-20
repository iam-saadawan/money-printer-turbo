import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { AbsoluteFill, useCurrentFrame } from "remotion";
export const Probe: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#223" }}>
      <ThreeCanvas width={1080} height={1920} camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 3, 4]} intensity={2} />
        <mesh rotation={[0.4, f * 0.05, 0]}><boxGeometry args={[1.5, 1.5, 1.5]} /><meshStandardMaterial color="red" /></mesh>
        <EffectComposer multisampling={4}><Vignette /></EffectComposer>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
