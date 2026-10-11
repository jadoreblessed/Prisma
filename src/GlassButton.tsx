import { useRef, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

type Props = { children: ReactNode; href?: string; onClick?: () => void; className?: string; arrow?: boolean; type?: 'button' | 'submit'; 'aria-label'?: string };
export default function GlassButton({ children, href, onClick, className = '', arrow = false, type = 'button', ...rest }: Props) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null);
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty('--light-x', `${((event.clientX-b.left)/b.width)*100}%`);
    el.style.setProperty('--light-y', `${((event.clientY-b.top)/b.height)*100}%`);
  };
  const leave = () => { ref.current?.style.setProperty('--light-x','50%'); ref.current?.style.setProperty('--light-y','12%'); };
  const shared = { className: `glass-button ${className}`, onPointerMove: move, onPointerLeave: leave, ...rest };
  const label = <><span className="glass-button__label">{children}</span>{arrow&&<ArrowRight className="glass-button__arrow" size={17} strokeWidth={1.8}/>}</>;
  return <span className="glass-button-shell">{href?<a {...shared} ref={ref} href={href}>{label}</a>:<button {...shared} ref={ref} type={type} onClick={onClick}>{label}</button>}</span>;
}
