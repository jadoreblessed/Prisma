import { useEffect, useRef } from 'react';

export default function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let frame = 0;
    let last = 0;
    let width = 0;
    let height = 0;
    let pointerX = .5;
    let pointerY = .5;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint(performance.now());
    };
    const paint = (now: number) => {
      context.clearRect(0, 0, width, height);
      const time = reduce.matches ? 0 : now * .00045;
      const spacing = width < 540 ? 9 : 8;
      const columns = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);
      const cx = width * .68;
      const cy = height * .44;
      const radius = Math.min(width * .34, height * .47);
      for (let row = 0; row <= rows; row++) {
        for (let column = 0; column <= columns; column++) {
          const x = column * spacing;
          const y = row * spacing;
          const nx = (x - cx) / radius;
          const ny = (y - cy) / radius;
          const angle = Math.atan2(ny, nx);
          const distance = Math.hypot(nx, ny);
          const fourPoint = .69 + .2 * Math.cos(4 * angle);
          const edge = Math.abs(distance - fourPoint);
          const wave = Math.sin(x * .011 + time * 2.2) * 22 + Math.sin(x * .022 - time * 1.4) * 10;
          const ribbon = Math.abs(y - (height * .7 + wave));
          const particle = edge < .21 || (distance < fourPoint && ((row + column) % 3 !== 0));
          const trail = ribbon < 85 && x > width * .12;
          if (!particle && !trail) continue;
          const pointer = Math.max(0, 1 - Math.hypot(x - pointerX * width, y - pointerY * height) / 140);
          const drift = Math.sin(time * 2 + column * .12 + row * .07) * (particle ? 3 : 6);
          const px = x + drift + pointer * (x - pointerX * width) * .04;
          const py = y + (particle ? Math.cos(time + column * .08) * 2 : wave * .17);
          const opacity = particle ? Math.max(.09, .68 - edge * 1.7) : Math.max(.035, .29 - ribbon * .003);
          const size = particle ? 1.15 + (1 - Math.min(edge * 3, 1)) * .65 : .75;
          context.fillStyle = `rgba(194,91,66,${Math.min(.83, opacity + pointer * .23).toFixed(3)})`;
          context.fillRect(px, py, size, size);
        }
      }
    };
    const tick = (now: number) => {
      if (!visible || reduce.matches) return;
      if (now - last >= 33) { paint(now); last = now; }
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden;
      cancelAnimationFrame(frame);
      if (visible && !reduce.matches) frame = requestAnimationFrame(tick);
      else paint(performance.now());
    }, { rootMargin: '100px' });
    const onVisibility = () => {
      if (document.hidden) { visible = false; cancelAnimationFrame(frame); }
      else if (canvas.getBoundingClientRect().bottom > 0 && canvas.getBoundingClientRect().top < innerHeight) {
        visible = true;
        if (!reduce.matches) frame = requestAnimationFrame(tick);
      }
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width;
      pointerY = (event.clientY - rect.top) / rect.height;
    };
    observer.observe(canvas);
    const resizer = new ResizeObserver(resize);
    resizer.observe(canvas);
    canvas.parentElement?.addEventListener('pointermove', onPointer);
    document.addEventListener('visibilitychange', onVisibility);
    resize();
    return () => {
      observer.disconnect(); resizer.disconnect(); cancelAnimationFrame(frame);
      canvas.parentElement?.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return <canvas className="signal-particles" ref={ref} aria-hidden="true" />;
}
