import React from 'react'
import Link from 'gatsby-link'
import styled from 'styled-components'
import Hr from '../atoms/Hr'

const Container = styled.div`
  margin: 0 auto;
  max-width: 960px;
  padding: 2rem;
`

const Footer = ({ title, author }) => (
  <Container>
    <Hr />
    <Link to="/profile/">
      <p>
        <strong>{author}</strong> on Profile
      </p>
    </Link>
  </Container>
)

export default Footer
