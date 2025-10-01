"use client"

import React from "react"
import styled from "styled-components"

interface Props {
  children: React.ReactNode
}

const GridWrapper = styled.div`
  margin: 0 auto;
  padding: 0 1rem;
  max-width: ${(props) => props.theme.contentWidth}px;
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: auto;

  @media (max-width: 767px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`

const TileGrid: React.FC<Props> = ({ children }) => {
  return <GridWrapper>{children}</GridWrapper>
}

export default TileGrid
