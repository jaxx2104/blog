import React from "react"
import { graphql } from "gatsby"
import { FluidObject } from "gatsby-image"
import { ProfilePageQuery } from "../../types/graphql-types"
import { siteMetadata } from "../../gatsby-config"
import Layout from "../containers/template"
import Meta from "../components/meta"
import ProfileOthers from "../containers/profile/profile-others"
import ProfileUser from "../containers/profile/profile-user"
import ProfileWork from "../containers/profile/profile-work"

interface Props {
  data: ProfilePageQuery
}

const ProfilePage: React.FC<Props> = ({ data }: Props) => (
  <Layout>
    <Meta site={siteMetadata} title="Profile" />
    <ProfileUser
      profile={data.profile?.childImageSharp?.fluid as FluidObject}
    />
    <ProfileWork
      mockup1={data.mockup1?.childImageSharp?.fluid as FluidObject}
      mockup2={data.mockup2?.childImageSharp?.fluid as FluidObject}
      mockup3={data.mockup3?.childImageSharp?.fluid as FluidObject}
      work1={data.work1?.childImageSharp?.fluid as FluidObject}
      work2={data.work2?.childImageSharp?.fluid as FluidObject}
    />
    <ProfileOthers />
  </Layout>
)

export default ProfilePage

export const query = graphql`
  query ProfilePage {
    profile: file(name: { eq: "profile" }) {
      childImageSharp {
        fluid(maxWidth: 700) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup1: file(name: { eq: "mockup1" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup2: file(name: { eq: "mockup2" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup3: file(name: { eq: "mockup3" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    work1: file(name: { eq: "work1" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    work2: file(name: { eq: "work2" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
  }
`
