import { Link as RouterLink } from "@tanstack/react-router"
import type { ComponentPropsWithoutRef, ReactNode } from "react"

type Props = Omit<
  ComponentPropsWithoutRef<typeof RouterLink>,
  "to" | "children"
> & {
  href: string
  children?: ReactNode
}

export default function Link({ href, ...rest }: Props) {
  return <RouterLink to={href} {...rest} />
}
