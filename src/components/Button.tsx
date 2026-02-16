'use client';

export default function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    ...props
}: {
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
} & React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) {
    const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1' : size === 'lg' ? 'text-sm px-5 py-2.5' : 'text-sm px-4 py-2';
    const base = `btn-${variant} ${sizeClass} ${className}`;
    return <button className={base} {...props}>{children}</button>;
}
