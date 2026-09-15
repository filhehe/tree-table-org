import { useLayoutEffect, useRef, type ReactNode } from 'react';
import styled from 'styled-components';
import { MOTION_DURATION_MS, usePrefersReducedMotion } from '@/ui/prefersReducedMotion';
import { consumeTreeMotion } from '@/data/store';

const Clip = styled.div`
  overflow: hidden;
  width: max-content;
  min-width: 100%;
`;

type ExpandableProps = {
  id: string;
  open: boolean;
  children: ReactNode;
};

function applyStatic(clip: HTMLElement, open: boolean) {
  clip.style.transition = 'none';
  clip.style.height = open ? 'auto' : '0px';
  clip.style.overflow = open ? 'visible' : 'hidden';
}

export function Expandable({ id, open, children }: ExpandableProps) {
  const reduced = usePrefersReducedMotion();
  const clipRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const clip = clipRef.current;
    const inner = innerRef.current;
    if (!clip || !inner) return;

    const requested = consumeTreeMotion(id);
    const shouldAnimate = !reduced && requested;
    if (!shouldAnimate) {
      applyStatic(clip, open);
      return;
    }

    clip.style.overflow = 'hidden';
    clip.style.transition = 'none';

    if (open) {
      clip.style.height = '0px';
      void clip.offsetHeight;
      clip.style.transition = `height ${MOTION_DURATION_MS}ms ease`;
      clip.style.height = `${inner.scrollHeight}px`;
      const timeout = window.setTimeout(() => {
        if (clipRef.current === clip) {
          clip.style.height = 'auto';
          clip.style.overflow = 'visible';
        }
      }, MOTION_DURATION_MS);
      return () => {
        window.clearTimeout(timeout);
      };
    }

    clip.style.height = `${inner.scrollHeight}px`;
    void clip.offsetHeight;
    clip.style.transition = `height ${MOTION_DURATION_MS}ms ease`;
    clip.style.height = '0px';
  }, [id, open, reduced]);

  return (
    <Clip ref={clipRef} data-expand-clip="">
      <div ref={innerRef}>{children}</div>
    </Clip>
  );
}
