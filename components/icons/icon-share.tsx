import type React from "react"
import {
  FacebookIcon,
  FacebookShareButton,
  TwitterIcon,
  TwitterShareButton,
} from "react-share"
import styled from "styled-components"

interface Props {
  url: string
  title: string
}

const Share: React.FC<Props> = ({ url, title }: Props) => (
  <ShareWrap>
    <TwitterShareButton url={url} title={title}>
      <TwitterIcon size={32} round={true} />
    </TwitterShareButton>
    <FacebookShareButton url={url}>
      <FacebookIcon size={32} round={true} />
    </FacebookShareButton>
  </ShareWrap>
)
export default Share

const ShareWrap = styled.div`
  display: flex;
  justify-content: center;
  margin: 0 auto;
  padding-bottom: 1.5rem;

  div {
    display: inline-block;
    margin: 0.25rem;
  }
`
