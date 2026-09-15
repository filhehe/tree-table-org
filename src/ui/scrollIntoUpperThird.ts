import { getPrefersReducedMotion, MOTION_DURATION_MS } from '@/ui/prefersReducedMotion';

const UPPER_THIRD = 1 / 3;

export function upperThirdScrollTop(
  container: { clientHeight: number; scrollHeight: number; scrollTop: number },
  elementTopInContent: number,
  inset = 0,
) {
  const usable = Math.max(0, container.clientHeight - inset);
  const target = elementTopInContent - inset - usable * UPPER_THIRD;
  const max = Math.max(0, container.scrollHeight - container.clientHeight);
  return Math.max(0, Math.min(target, max));
}

function scrollParent(element: HTMLElement) {
  return element.closest<HTMLElement>('[data-scroll-pane]');
}

function headerInset(container: HTMLElement) {
  const header = container.querySelector('thead');
  return header instanceof HTMLElement ? header.getBoundingClientRect().height : 0;
}

function targetRect(element: HTMLElement) {
  if (element instanceof HTMLTableRowElement) {
    const cell = element.cells[0];
    if (cell) return cell.getBoundingClientRect();
  }
  return element.getBoundingClientRect();
}

function expandingClips(element: HTMLElement) {
  const clips: HTMLElement[] = [];
  let node: HTMLElement | null = element;
  while (node) {
    if (node.hasAttribute('data-expand-clip')) {
      const height = node.style.height;
      if (height.endsWith('px') || node.getAnimations().length > 0) clips.push(node);
    }
    node = node.parentElement;
  }
  return clips;
}

export function scrollElementToUpperThird(element: HTMLElement) {
  const container = scrollParent(element);
  if (!container) return;

  const containerRect = container.getBoundingClientRect();
  const elementRect = targetRect(element);
  const elementTopInContent = container.scrollTop + (elementRect.top - containerRect.top);
  const top = upperThirdScrollTop(container, elementTopInContent, headerInset(container));

  container.scrollTo({
    top,
    behavior: getPrefersReducedMotion() ? 'auto' : 'smooth',
  });
}

function afterLayout(frame: () => void) {
  let inner = 0;
  const outer = window.requestAnimationFrame(() => {
    inner = window.requestAnimationFrame(frame);
  });
  return () => {
    window.cancelAnimationFrame(outer);
    window.cancelAnimationFrame(inner);
  };
}

export function scheduleScrollToUpperThird(element: HTMLElement | null) {
  if (!element) return () => {};

  if (getPrefersReducedMotion()) {
    scrollElementToUpperThird(element);
    return () => {};
  }

  let cancelled = false;
  let stopWait = () => {};

  const run = () => {
    if (cancelled || !element.isConnected) return;
    scrollElementToUpperThird(element);
  };

  const waitForExpand = () => {
    if (cancelled || !element.isConnected) return;

    const clips = expandingClips(element);
    if (clips.length === 0) {
      run();
      return;
    }

    let left = clips.length;
    let settled = false;
    const onEnd = (event: Event) => {
      if (!(event instanceof TransitionEvent)) return;
      if (event.propertyName !== 'height' && event.propertyName !== 'grid-template-rows') {
        return;
      }
      left -= 1;
      if (left <= 0) finish();
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      stopWait();
      run();
    };
    for (const clip of clips) clip.addEventListener('transitionend', onEnd);
    const timeout = window.setTimeout(finish, MOTION_DURATION_MS + 80);
    stopWait = () => {
      for (const clip of clips) clip.removeEventListener('transitionend', onEnd);
      window.clearTimeout(timeout);
    };
  };

  const cancelLayout = afterLayout(waitForExpand);

  return () => {
    cancelled = true;
    cancelLayout();
    stopWait();
  };
}
