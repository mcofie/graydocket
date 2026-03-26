import styles from './skeleton.module.css'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  circle?: boolean
  style?: React.CSSProperties
}

export default function Skeleton({ className = '', width, height, circle = false, style }: SkeletonProps) {
  return (
    <div 
      className={`${styles.skeleton} ${className}`} 
      style={{ 
        width, 
        height, 
        borderRadius: circle ? '50%' : 'var(--radius-md)',
        ...style
      }}
    />
  )
}
