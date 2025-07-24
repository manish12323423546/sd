import { ReactNode } from 'react';

interface CategoryBadgeProps {
  children: ReactNode;
  variant?: 'cast' | 'props' | 'location' | 'sound' | 'costumes' | 'vehicles' | 'animals' | 'set' | 'default';
  count?: number;
}

export const CategoryBadge = ({ children, variant = 'default', count }: CategoryBadgeProps) => {
  const variants = {
    cast: 'bg-blue-100 text-blue-800',
    props: 'bg-orange-100 text-orange-800',
    location: 'bg-green-100 text-green-800',
    sound: 'bg-purple-100 text-purple-800',
    costumes: 'bg-yellow-100 text-yellow-800',
    vehicles: 'bg-indigo-100 text-indigo-800',
    animals: 'bg-pink-100 text-pink-800',
    set: 'bg-gray-100 text-gray-800',
    default: 'bg-gray-100 text-gray-800'
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
      {count !== undefined && ` (${count})`}
    </span>
  );
};