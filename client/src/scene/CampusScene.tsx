import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ExtrudeGeometry, Group, MathUtils, Shape } from 'three';

/** Original procedural artwork. No downloaded models, fonts, or textures.
 * The host supplies the accessible text alternative and a WebGL/mobile fallback.
 */
type CampusSceneProps = {
  onReady?: () => void;
  onFailure?: () => void;
  reducedMotion?: boolean;
};

type Vector = [number, number, number];

const colors = {
  blue: '#335CFF',
  blueLight: '#6683ff',
  violet: '#8B5CF6',
  violetDark: '#5a35b9',
  coral: '#FF6584',
  lime: '#D9FF66',
  cream: '#FFF9EF',
  ink: '#101426',
};

function Clay({ color, roughness = 0.35 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0.04} />;
}

function RoundedBlock({
  size,
  color,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  radius = 0.12,
}: {
  size: Vector;
  color: string;
  position?: Vector;
  rotation?: Vector;
  radius?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(() => {
    const bevel = Math.min(depth * 0.24, 0.045);
    const x = width / 2 - bevel;
    const y = height / 2 - bevel;
    const r = Math.max(0.005, Math.min(radius, x, y));
    const shape = new Shape();
    shape.moveTo(-x + r, -y);
    shape.lineTo(x - r, -y);
    shape.quadraticCurveTo(x, -y, x, -y + r);
    shape.lineTo(x, y - r);
    shape.quadraticCurveTo(x, y, x - r, y);
    shape.lineTo(-x + r, y);
    shape.quadraticCurveTo(-x, y, -x, y - r);
    shape.lineTo(-x, -y + r);
    shape.quadraticCurveTo(-x, -y, -x + r, -y);
    const result = new ExtrudeGeometry(shape, {
      depth: depth - bevel * 2,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 5,
    });
    result.translate(0, 0, -(depth - bevel * 2) / 2);
    return result;
  }, [width, height, depth, radius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <Clay color={color} />
    </mesh>
  );
}

function Float({
  children,
  position,
  rotation,
  scale = 1,
  phase = 0,
  reducedMotion,
}: {
  children: ReactNode;
  position: Vector;
  rotation: Vector;
  scale?: number;
  phase?: number;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !group.current) return;
    const t = clock.elapsedTime * 0.52 + phase;
    group.current.position.y = position[1] + Math.sin(t) * 0.075;
    group.current.rotation.z = rotation[2] + Math.sin(t * 0.77) * 0.038;
    group.current.rotation.y = rotation[1] + Math.cos(t * 0.64) * 0.055;
  });
  return (
    <group ref={group} position={position} rotation={rotation} scale={scale}>
      {children}
    </group>
  );
}

function Headphones() {
  return (
    <group>
      <mesh position={[0, 0.13, 0]}>
        <torusGeometry args={[0.75, 0.135, 8, 36, Math.PI]} />
        <Clay color={colors.violet} />
      </mesh>
      <mesh position={[0, 0.13, 0.01]}>
        <torusGeometry args={[0.75, 0.065, 8, 36, Math.PI]} />
        <Clay color={colors.violetDark} />
      </mesh>
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[side * 0.76, -0.13, 0]}
          rotation={[0, side * 0.16, side * 0.06]}
        >
          <RoundedBlock
            size={[0.26, 0.5, 0.28]}
            color={colors.lime}
            position={[0, 0.16, 0]}
            radius={0.12}
          />
          <RoundedBlock
            size={[0.4, 0.64, 0.47]}
            color={colors.violet}
            position={[0, -0.13, 0]}
            radius={0.18}
          />
          <RoundedBlock
            size={[0.3, 0.49, 0.1]}
            color={colors.coral}
            position={[0, -0.13, 0.26]}
            radius={0.14}
          />
          <RoundedBlock
            size={[0.1, 0.22, 0.025]}
            color={colors.cream}
            position={[0, -0.13, 0.32]}
            radius={0.045}
          />
        </group>
      ))}
    </group>
  );
}

function Backpack() {
  return (
    <group>
      {([-1, 1] as const).map((side) => (
        <RoundedBlock
          key={side}
          size={[0.23, 1.55, 0.21]}
          color={colors.ink}
          position={[side * 0.47, -0.03, -0.4]}
          rotation={[0, 0, side * -0.08]}
          radius={0.11}
        />
      ))}
      <mesh position={[0, 0.91, -0.11]}>
        <torusGeometry args={[0.25, 0.075, 8, 20, Math.PI]} />
        <Clay color={colors.ink} />
      </mesh>
      <RoundedBlock size={[1.52, 1.85, 0.66]} color={colors.blue} radius={0.29} />
      <RoundedBlock
        size={[1.19, 0.68, 0.22]}
        color={colors.blueLight}
        position={[0, -0.43, 0.4]}
        radius={0.17}
      />
      <RoundedBlock
        size={[0.99, 0.045, 0.027]}
        color={colors.cream}
        position={[0, -0.21, 0.525]}
        radius={0.018}
      />
      <RoundedBlock
        size={[0.1, 0.2, 0.06]}
        color={colors.coral}
        position={[0.42, -0.31, 0.57]}
        rotation={[0, 0, -0.16]}
        radius={0.04}
      />
      <RoundedBlock
        size={[0.45, 0.25, 0.04]}
        color={colors.lime}
        position={[0, 0.38, 0.36]}
        radius={0.055}
      />
      <RoundedBlock
        size={[0.24, 0.035, 0.025]}
        color={colors.ink}
        position={[0, 0.41, 0.39]}
        radius={0.012}
      />
      <RoundedBlock
        size={[0.13, 0.035, 0.025]}
        color={colors.ink}
        position={[-0.055, 0.33, 0.39]}
        radius={0.012}
      />
      <RoundedBlock
        size={[0.21, 0.62, 0.29]}
        color={colors.violet}
        position={[0.76, -0.32, -0.02]}
        radius={0.09}
      />
    </group>
  );
}

function Bottle() {
  return (
    <group>
      <mesh>
        <capsuleGeometry args={[0.33, 0.88, 6, 20]} />
        <Clay color={colors.lime} />
      </mesh>
      <mesh position={[0, 0.79, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.25, 20]} />
        <Clay color={colors.lime} />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.22, 20]} />
        <Clay color={colors.blue} />
      </mesh>
      <mesh position={[0.29, 0.94, 0]}>
        <torusGeometry args={[0.18, 0.047, 6, 18]} />
        <Clay color={colors.blue} />
      </mesh>
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.334, 0.334, 0.37, 20]} />
        <Clay color={colors.cream} />
      </mesh>
      <mesh position={[0, -0.11, 0.34]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.105, 0.105, 0.017, 20]} />
        <Clay color={colors.violet} />
      </mesh>
    </group>
  );
}

function Phone() {
  return (
    <group>
      <RoundedBlock size={[0.88, 1.59, 0.18]} color={colors.coral} radius={0.15} />
      <RoundedBlock
        size={[0.73, 1.41, 0.035]}
        color={colors.cream}
        position={[0, 0, 0.106]}
        radius={0.11}
      />
      <RoundedBlock
        size={[0.22, 0.045, 0.02]}
        color={colors.ink}
        position={[0, 0.59, 0.135]}
        radius={0.022}
      />
      <RoundedBlock
        size={[0.58, 0.32, 0.025]}
        color={colors.blue}
        position={[0, -0.42, 0.136]}
        radius={0.055}
      />
      <RoundedBlock
        size={[0.3, 0.035, 0.02]}
        color={colors.lime}
        position={[-0.07, -0.38, 0.156]}
        radius={0.015}
      />
      <RoundedBlock
        size={[0.39, 0.03, 0.02]}
        color={colors.cream}
        position={[-0.025, -0.47, 0.156]}
        radius={0.013}
      />
      <RoundedBlock
        size={[0.22, 0.22, 0.025]}
        color={colors.violet}
        position={[0, 0.065, 0.14]}
        rotation={[0, 0, Math.PI / 4]}
        radius={0.035}
      />
      <mesh position={[0, 0.23, 0.15]}>
        <torusGeometry args={[0.145, 0.065, 8, 24]} />
        <Clay color={colors.violet} />
      </mesh>
      <mesh position={[0, 0.23, 0.17]}>
        <circleGeometry args={[0.078, 20]} />
        <Clay color={colors.cream} />
      </mesh>
      <RoundedBlock
        size={[0.025, 0.2, 0.06]}
        color={colors.cream}
        position={[0.447, 0.24, 0]}
        radius={0.01}
      />
    </group>
  );
}

function Keys() {
  return (
    <group>
      <mesh position={[0, 0.25, 0]}>
        <torusGeometry args={[0.26, 0.055, 6, 24]} />
        <Clay color={colors.coral} />
      </mesh>
      {[
        { rotation: -0.23, z: 0.02, color: colors.lime },
        { rotation: 0.5, z: -0.06, color: colors.cream },
      ].map((key, i) => (
        <group key={i} position={[0, 0.01, key.z]} rotation={[0, 0, key.rotation]}>
          <mesh>
            <torusGeometry args={[0.13, 0.07, 6, 18]} />
            <Clay color={key.color} />
          </mesh>
          <RoundedBlock
            size={[0.12, 0.63, 0.1]}
            color={key.color}
            position={[0, -0.39, 0]}
            radius={0.03}
          />
          <RoundedBlock
            size={[0.26, 0.1, 0.1]}
            color={key.color}
            position={[0.07, -0.54, 0]}
            radius={0.018}
          />
          <RoundedBlock
            size={[0.22, 0.1, 0.1]}
            color={key.color}
            position={[0.05, -0.7, 0]}
            radius={0.018}
          />
        </group>
      ))}
    </group>
  );
}

function CampusCard() {
  return (
    <group>
      <RoundedBlock size={[1.18, 0.75, 0.08]} color={colors.cream} radius={0.1} />
      <RoundedBlock
        size={[1.12, 0.16, 0.025]}
        color={colors.violet}
        position={[0, 0.255, 0.055]}
        radius={0.035}
      />
      <RoundedBlock
        size={[0.29, 0.31, 0.025]}
        color={colors.coral}
        position={[-0.32, -0.05, 0.057]}
        radius={0.045}
      />
      <mesh position={[-0.32, -0.005, 0.08]}>
        <circleGeometry args={[0.065, 18]} />
        <Clay color={colors.cream} />
      </mesh>
      <RoundedBlock
        size={[0.17, 0.08, 0.02]}
        color={colors.cream}
        position={[-0.32, -0.11, 0.08]}
        radius={0.035}
      />
      <RoundedBlock
        size={[0.4, 0.045, 0.025]}
        color={colors.blue}
        position={[0.14, 0.02, 0.06]}
        radius={0.018}
      />
      <RoundedBlock
        size={[0.3, 0.035, 0.025]}
        color={colors.violet}
        position={[0.09, -0.095, 0.06]}
        radius={0.015}
      />
      <RoundedBlock
        size={[0.21, 0.035, 0.025]}
        color={colors.violet}
        position={[0.045, -0.19, 0.06]}
        radius={0.015}
      />
    </group>
  );
}

function Belongings({ reducedMotion }: { reducedMotion: boolean }) {
  const stage = useRef<Group>(null);
  const width = useThree((state) => state.viewport.width);

  useFrame(({ pointer }, delta) => {
    if (reducedMotion || !stage.current) return;
    const step = Math.min(delta, 0.05);
    stage.current.rotation.y = MathUtils.damp(stage.current.rotation.y, pointer.x * 0.1, 4, step);
    stage.current.rotation.x = MathUtils.damp(stage.current.rotation.x, -pointer.y * 0.07, 4, step);
  });

  return (
    <group ref={stage} scale={Math.min(1, width / 5.5)}>
      <Float
        position={[-1.15, 1.05, 0.35]}
        rotation={[0.04, 0.16, -0.21]}
        phase={0}
        reducedMotion={reducedMotion}
      >
        <Headphones />
      </Float>
      <Float
        position={[0.65, -0.25, 0.15]}
        rotation={[0.09, -0.36, -0.17]}
        phase={2.2}
        reducedMotion={reducedMotion}
      >
        <Backpack />
      </Float>
      <Float
        position={[-1.73, -1.01, 0.6]}
        rotation={[-0.1, 0.15, 0.31]}
        scale={0.85}
        phase={4.2}
        reducedMotion={reducedMotion}
      >
        <Bottle />
      </Float>
      <Float
        position={[1.58, 1.45, -0.3]}
        rotation={[0.01, -0.28, 0.29]}
        scale={0.84}
        phase={1.5}
        reducedMotion={reducedMotion}
      >
        <Phone />
      </Float>
      <Float
        position={[1.99, -1.4, 0.6]}
        rotation={[0.13, -0.3, -0.21]}
        scale={0.83}
        phase={3.1}
        reducedMotion={reducedMotion}
      >
        <Keys />
      </Float>
      <Float
        position={[-0.28, -1.91, 0.55]}
        rotation={[0.13, 0.16, -0.13]}
        scale={0.95}
        phase={5.1}
        reducedMotion={reducedMotion}
      >
        <CampusCard />
      </Float>
      <Float
        position={[-2.1, 0.23, -0.1]}
        rotation={[0.3, 0.3, 0]}
        scale={0.1}
        phase={2}
        reducedMotion={reducedMotion}
      >
        <mesh>
          <octahedronGeometry args={[1, 0]} />
          <Clay color={colors.coral} />
        </mesh>
      </Float>
      <Float
        position={[0.12, 2.02, 0]}
        rotation={[0.3, 0.2, 0.1]}
        scale={0.09}
        phase={4}
        reducedMotion={reducedMotion}
      >
        <mesh>
          <sphereGeometry args={[1, 12, 8]} />
          <Clay color={colors.lime} />
        </mesh>
      </Float>
    </group>
  );
}

function ContextLossListener({ onFailure }: Pick<CampusSceneProps, 'onFailure'>) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const handleContextLoss = () => onFailure?.();
    canvas.addEventListener('webglcontextlost', handleContextLoss);
    return () => canvas.removeEventListener('webglcontextlost', handleContextLoss);
  }, [canvas, onFailure]);
  return null;
}

export default function CampusScene({
  onReady,
  onFailure,
  reducedMotion = false,
}: CampusSceneProps) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      camera={{ position: [0, 0, 9], fov: 34, near: 0.1, far: 30 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        onReady?.();
      }}
      style={{ width: '100%', height: '100%', pointerEvents: reducedMotion ? 'none' : 'auto' }}
    >
      <ContextLossListener onFailure={onFailure} />
      <ambientLight intensity={1.1} />
      <hemisphereLight args={['#fff9ef', '#4a2b89', 1.25]} />
      <directionalLight position={[-4, 6, 7]} intensity={3.2} color="#fff9ef" />
      <pointLight position={[4, -1, 4]} intensity={18} color="#c3b2ff" />
      <Belongings reducedMotion={reducedMotion} />
    </Canvas>
  );
}
