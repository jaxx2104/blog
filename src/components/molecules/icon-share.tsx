import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
} from "react-share"
import React from "react"
import styled from "styled-components"

const Share = ({ url, title }) => (
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
