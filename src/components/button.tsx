import React from "react"
import Link from "next/link"
import styled from "styled-components"

interface Props {
  label: string
  path: string
  primary: boolean
}

const Button: React.FC<Props> = ({ label, path, primary }: Props) => (
  <Link className="readmore" href={path} style={{ textDecoration: "none" }}>
    <StyledButton $primary={primary}>{label}</StyledButton>
  </Link>
)

export default Button

const StyledButton = styled.button<{ $primary: boolean }>`
  background-color: transparent;
  border-radius: 4px;
  border: 2px solid
    ${(props) =>
      props.$primary ? props.theme.colorMain : props.theme.colorSub};
  color: ${(props) =>
    props.$primary ? props.theme.colorMain : props.theme.colorSub};
  cursor: pointer;
  display: block;
  font-size: ${(props) => `${props.theme.fontSizeLarge}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  text-align: center;
  user-select: none;
  white-space: nowrap;
  width: 100%;
  height: 48px;

  &:hover {
    transition: color 0.2s ease-out, background 0.2s ease-out;
    background-color: ${(props) =>
      props.$primary ? props.theme.colorMain : props.theme.colorSub};
    color: white;
  }
`
