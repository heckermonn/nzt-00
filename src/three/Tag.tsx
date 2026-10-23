import { forwardRef, type ReactNode } from 'react';
import { Html } from '@react-three/drei';

/** a mono instrument label pinned to a 3D point; parents toggle `.on` / `.hot` on the ref every frame */
export const Tag = forwardRef<HTMLDivElement, { position?: [number, number, number]; flat?: boolean; children: ReactNode }>(
  ({ position = [0, 0, 0], flat, children }, ref) => (
    <Html position={position} zIndexRange={[4, 0]} style={{ pointerEvents: 'none' }}>
      <div ref={ref} className={`tag${flat ? ' flat' : ''}`}>{children}</div>
    </Html>
  ),
);
