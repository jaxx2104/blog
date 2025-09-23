"use client"

import React from "react"
import Link from "next/link"
import styled from "styled-components"

interface Props {
  title: string
}

const Logo: React.FC<Props> = ({ title }: Props) => (
  <Link href="/">
    <LogoWrap>{title}</LogoWrap>
  </Link>
)

export default Logo

const LogoWrap = styled.h1<{ uppercase?: boolean }>`
  color: white;
  font-family: "Permanent Marker";
  font-size: ${(props) => `${props.theme.fontSizeLarge}rem`};
  font-weight: 900;
  letter-spacing: -0.05rem;
  text-transform: "uppercase";
  margin-right: 1rem;

  &:hover {
    color: ${(props) => props.theme.colorAccent};
    transition: color 0.2s ease-out;
  }
`
