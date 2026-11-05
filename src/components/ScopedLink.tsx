import { forwardRef } from 'react'
import { Link as RouterLink, type LinkProps } from 'react-router-dom'
import { useScopedPath } from '../context/UdcScope'

/** Router link whose absolute `to` is inside the current UDC instance's workspace. */
const ScopedLink = forwardRef<HTMLAnchorElement, LinkProps>(function ScopedLink({ to, ...props }, ref) {
  const path = useScopedPath()
  return <RouterLink ref={ref} to={typeof to === 'string' ? path(to) : to} {...props} />
})

export default ScopedLink
